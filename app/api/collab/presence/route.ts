import { NextRequest, NextResponse } from "next/server";
import {
  cleanClientId,
  resolveCollabAccess,
  CollabAccessError,
} from "@/lib/collab/access";
import { upsertPresence } from "@/lib/collab/hub";
import { shareTokenFromRequest } from "@/lib/collab/token";
import type { CollaboratorPresence } from "@/lib/collab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizePointer(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const x = Number(record.x);
  const y = Number(record.y);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 10_000_000 ||
    Math.abs(y) > 10_000_000
  ) {
    return undefined;
  }
  return {
    x,
    y,
    tool: record.tool === "laser" ? ("laser" as const) : ("pointer" as const),
  };
}

function sanitizeSelectedIds(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const result: Record<string, true> = {};
  let count = 0;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.length === 0 || key.length > 160) continue;
    result[key] = true;
    count += 1;
    if (count >= 200) break;
  }
  return count > 0 ? result : {};
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid presence payload." }, { status: 400 });
    }

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    const clientId = cleanClientId(body.clientId);
    if (!projectId || !clientId) {
      return NextResponse.json({ error: "Missing presence identity." }, { status: 400 });
    }

    const token =
      (typeof body.shareToken === "string" ? body.shareToken : null) ||
      shareTokenFromRequest(req);

    const access = await resolveCollabAccess({
      projectId,
      token,
      clientId,
      guestName: typeof body.guestName === "string" ? body.guestName : null,
    });

    const presence: CollaboratorPresence = {
      clientId,
      identityId: access.identity.id,
      name: access.identity.name,
      color: access.identity.color,
      avatarUrl: access.identity.avatarUrl,
      pointer: sanitizePointer(body.pointer),
      button: body.button === "down" ? "down" : "up",
      selectedElementIds: sanitizeSelectedIds(body.selectedElementIds),
      activeTool:
        typeof body.activeTool === "string"
          ? body.activeTool.slice(0, 32)
          : undefined,
      pageVisible: body.pageVisible !== false,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const participants = upsertPresence(projectId, presence);
    return NextResponse.json({ participants, role: access.role });
  } catch (error) {
    if (error instanceof CollabAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Collaboration presence error:", error);
    return NextResponse.json(
      { error: "Could not update presence." },
      { status: 500 }
    );
  }
}
