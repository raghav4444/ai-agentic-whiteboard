import { NextRequest, NextResponse } from "next/server";
import {
  canEdit,
  cleanClientId,
  resolveCollabAccess,
  CollabAccessError,
} from "@/lib/collab/access";
import { broadcastScene, listPresence } from "@/lib/collab/hub";
import { sanitizeElements } from "@/lib/collab/merge";
import { loadCollabScene, saveCollabScene } from "@/lib/collab/scene-store";
import { shareTokenFromRequest } from "@/lib/collab/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof CollabAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Collaboration state error:", error);
  return NextResponse.json(
    { error: "The collaboration service is unavailable." },
    { status: 500 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || "";
    const token = shareTokenFromRequest(req);

    const access = await resolveCollabAccess({
      projectId,
      token,
      clientId: searchParams.get("clientId"),
      guestName: searchParams.get("name"),
      color: searchParams.get("color"),
    });

    const snapshot = await loadCollabScene(projectId);

    return NextResponse.json({
      ...snapshot,
      role: access.role,
      identity: access.identity,
      projectName: access.projectName,
      participants: listPresence(projectId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 12_000_000) {
      return NextResponse.json(
        { error: "This board is too large to sync in one request." },
        { status: 413 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const token =
      (typeof body.shareToken === "string" ? body.shareToken : null) ||
      shareTokenFromRequest(req);
    const clientId = cleanClientId(body.clientId);

    const access = await resolveCollabAccess({
      projectId,
      token,
      clientId,
      guestName: typeof body.guestName === "string" ? body.guestName : null,
    });

    if (!canEdit(access)) {
      return NextResponse.json(
        { error: "This is a view-only share link." },
        { status: 403 }
      );
    }

    const elements = Array.isArray(body.elements)
      ? sanitizeElements(body.elements)
      : undefined;
    const files =
      body.files && typeof body.files === "object"
        ? (body.files as never)
        : undefined;
    const appState =
      body.appState && typeof body.appState === "object"
        ? (body.appState as Record<string, unknown>)
        : undefined;
    const doc =
      body.doc && typeof body.doc === "object"
        ? (body.doc as never)
        : body.doc === null
          ? null
          : undefined;

    const saved = await saveCollabScene(
      {
        projectId,
        elements,
        files,
        appState,
        doc,
      },
      {
        updatedBy: access.identity.name,
        sourceClientId: clientId || undefined,
      }
    );

    broadcastScene(projectId, {
      elements: saved.changedElements,
      files:
        Object.keys(saved.changedFiles).length > 0
          ? saved.changedFiles
          : undefined,
      doc: saved.changedDoc || undefined,
      revision: saved.snapshot.revision,
      updatedBy: access.identity.name,
      sourceClientId: clientId || undefined,
    });

    return NextResponse.json({
      ...saved.snapshot,
      role: access.role,
      identity: access.identity,
      projectName: access.projectName,
      participants: listPresence(projectId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
