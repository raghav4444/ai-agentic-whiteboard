import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, projects, WhiteboardData } from "@/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { invalidateProjectAccess } from "@/lib/collab/access";

function isTruthyParam(value: string | null): boolean {
  return value === "1" || value === "true";
}

function currentEmail(user: Awaited<ReturnType<typeof currentUser>>): string {
  return user?.primaryEmailAddress?.emailAddress ?? "";
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || searchParams.get("projectid");
    const userEmail = currentEmail(user);

    if (projectId) {
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.userEmail, userEmail),
            isNull(projects.deletedAt)
          )
        )
        .limit(1);

      if (!project || project.length === 0) {
        return NextResponse.json({ message: "Project not found" }, { status: 404 });
      }

      return NextResponse.json(project[0], { status: 200 });
    }

    const isTrash = isTruthyParam(
      searchParams.get("trash") ?? searchParams.get("deleted")
    );

    const userProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userEmail, userEmail),
          isTrash ? isNotNull(projects.deletedAt) : isNull(projects.deletedAt)
        )
      )
      .orderBy(isTrash ? desc(projects.deletedAt) : desc(projects.createdAt));

    return NextResponse.json(userProjects, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { message: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectName, projectId } = body;

    if (!projectId || !projectName) {
      return NextResponse.json({ message: "Missing Required Data" }, { status: 400 });
    }

    const result = await db
      .insert(projects)
      .values({
        projectId: projectId,
        projectName: projectName ?? "Untitled Project",
        userEmail: currentEmail(user),
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || searchParams.get("projectid");

    if (!projectId) {
      return NextResponse.json({ message: "Missing projectId" }, { status: 400 });
    }

    const userEmail = currentEmail(user);
    const permanent = isTruthyParam(searchParams.get("permanent"));

    if (permanent) {
      // Only boards already in the recycle bin can be permanently removed.
      const trashed = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.userEmail, userEmail),
            isNotNull(projects.deletedAt)
          )
        )
        .limit(1);

      if (trashed.length === 0) {
        return NextResponse.json(
          { message: "Project is not in the recycle bin" },
          { status: 404 }
        );
      }

      await db
        .delete(WhiteboardData)
        .where(eq(WhiteboardData.projectId, projectId));

      await db
        .delete(projects)
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.userEmail, userEmail),
            isNotNull(projects.deletedAt)
          )
        );

      invalidateProjectAccess(projectId);

      return NextResponse.json(
        { message: "Project permanently deleted" },
        { status: 200 }
      );
    }

    const trashed = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(projects.projectId, projectId),
          eq(projects.userEmail, userEmail),
          isNull(projects.deletedAt)
        )
      )
      .returning();

    if (trashed.length === 0) {
      return NextResponse.json(
        { message: "Project is not in your active library" },
        { status: 404 }
      );
    }

    invalidateProjectAccess(projectId);

    return NextResponse.json(
      { message: "Project moved to recycle bin", project: trashed[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { message: "Failed to delete project" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const projectId =
      typeof body?.projectId === "string" ? body.projectId.trim() : "";
    const userEmail = currentEmail(user);

    if (!projectId) {
      return NextResponse.json({ message: "Missing Required Data" }, { status: 400 });
    }

    if (body?.restore === true) {
      const restored = await db
        .update(projects)
        .set({ deletedAt: null })
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.userEmail, userEmail),
            isNotNull(projects.deletedAt)
          )
        )
        .returning();

      if (restored.length === 0) {
        return NextResponse.json(
          { message: "Project is not in the recycle bin" },
          { status: 404 }
        );
      }

      invalidateProjectAccess(projectId);

      return NextResponse.json(restored[0], { status: 200 });
    }

    const projectName =
      typeof body?.projectName === "string" ? body.projectName.trim() : "";

    if (!projectName) {
      return NextResponse.json({ message: "Missing Required Data" }, { status: 400 });
    }

    const updated = await db
      .update(projects)
      .set({ projectName })
      .where(
        and(
          eq(projects.projectId, projectId),
          eq(projects.userEmail, userEmail),
          isNull(projects.deletedAt)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { message: "Failed to update project" },
      { status: 500 }
    );
  }
}
