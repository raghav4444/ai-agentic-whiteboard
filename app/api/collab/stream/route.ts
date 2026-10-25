import { NextRequest } from "next/server";
import {
  cleanClientId,
  resolveCollabAccess,
  CollabAccessError,
} from "@/lib/collab/access";
import {
  getRoomRevision,
  listPresence,
  removePresence,
  subscribe,
  touchPresence,
  upsertPresence,
} from "@/lib/collab/hub";
import { shareTokenFromRequest } from "@/lib/collab/token";
import type { CollabEvent, CollaboratorPresence } from "@/lib/collab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 12_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  const clientId = cleanClientId(searchParams.get("clientId"));

  if (!projectId || !clientId) {
    return Response.json(
      { error: "Missing collaboration identity." },
      { status: 400 }
    );
  }

  let access;
  try {
    access = await resolveCollabAccess({
      projectId,
      token: shareTokenFromRequest(req),
      clientId,
      guestName: searchParams.get("name"),
      color: searchParams.get("color"),
    });
  } catch (error) {
    const status = error instanceof CollabAccessError ? error.status : 500;
    return Response.json(
      {
        error:
          error instanceof CollabAccessError
            ? error.message
            : "Could not join this board.",
      },
      { status }
    );
  }

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const presence: CollaboratorPresence = {
    clientId,
    identityId: access.identity.id,
    name: access.identity.name,
    color: access.identity.color,
    avatarUrl: access.identity.avatarUrl,
    button: "up",
    selectedElementIds: {},
    pageVisible: true,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (event: CollabEvent) => {
        write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        removePresence(projectId, clientId);
        try {
          controller.close();
        } catch {
          // The client may already have closed the stream.
        }
      };

      unsubscribe = subscribe(projectId, { clientId, send });
      upsertPresence(projectId, presence);

      send({
        type: "hello",
        hello: {
          participants: listPresence(projectId),
          revision: getRoomRevision(projectId),
          role: access.role,
          projectName: access.projectName,
        },
      });

      heartbeat = setInterval(() => {
        if (closed) return;
        touchPresence(projectId, clientId);
        write(`: heartbeat ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      removePresence(projectId, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
