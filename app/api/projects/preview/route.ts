import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { db, projects, WhiteboardData } from "@/db";
import {
  mergeBinaryFiles,
  pickPersistedAppState,
  sanitizeElements,
} from "@/lib/collab/merge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId =
      searchParams.get("projectId") || searchParams.get("projectid");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const rows = await db
      .select({
        projectId: projects.projectId,
        projectName: projects.projectName,
        createdAt: projects.createdAt,
        deletedAt: projects.deletedAt,
        elements: WhiteboardData.elements,
        appState: WhiteboardData.appState,
        files: WhiteboardData.files,
        updatedAt: WhiteboardData.updatedAt,
      })
      .from(projects)
      .leftJoin(WhiteboardData, eq(WhiteboardData.projectId, projects.projectId))
      .where(
        and(
          eq(projects.projectId, projectId),
          eq(projects.userEmail, user.primaryEmailAddress?.emailAddress ?? "")
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    const appState = pickPersistedAppState(
      (row.appState || {}) as Record<string, unknown>
    );

    return NextResponse.json(
      {
        projectId: row.projectId,
        projectName: row.projectName,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
        updatedAt: row.updatedAt,
        elements: sanitizeElements(row.elements),
        appState,
        files: mergeBinaryFiles(undefined, row.files as BinaryFiles).files,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error loading board preview:", error);
    return NextResponse.json(
      { error: "Failed to load board preview." },
      { status: 500 }
    );
  }
}
