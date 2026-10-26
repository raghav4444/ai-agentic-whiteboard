import { currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@/db";
import { createShareToken } from "@/lib/collab/token";
import type { SharePermission } from "@/lib/collab/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | { projectId?: unknown; permission?: unknown }
      | null;
    const projectId =
      typeof body?.projectId === "string" ? body.projectId.trim() : "";

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const permission: SharePermission =
      body?.permission === "view" ? "view" : "edit";
    const email = user.primaryEmailAddress?.emailAddress || "";

    const rows = await db
      .select({
        projectName: projects.projectName,
        userEmail: projects.userEmail,
      })
      .from(projects)
      .where(
        and(eq(projects.projectId, projectId), isNull(projects.deletedAt))
      )
      .limit(1);

    const project = rows[0];
    if (!project) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    if (project.userEmail !== email) {
      return NextResponse.json(
        { error: "Only the board owner can create share links." },
        { status: 403 }
      );
    }

    const token = createShareToken({
      projectId,
      projectName: project.projectName,
      permission,
    });
    const origin = req.nextUrl.origin;
    const url = `${origin}/share/${token}`;

    return NextResponse.json({
      token,
      url,
      permission,
      projectId,
      projectName: project.projectName,
    });
  } catch (error) {
    console.error("Share link error:", error);
    return NextResponse.json(
      {
        error: "Could not create a share link.",
        detail:
          "The board database is unavailable right now. Your canvas is still safe locally.",
      },
      { status: 503 }
    );
  }
}
