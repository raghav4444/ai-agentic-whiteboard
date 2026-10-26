import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, projects } from "@/db";
import { colorForIdentity } from "./merge";
import { verifyShareToken } from "./token";
import type { CollabIdentity, CollabRole } from "./types";

export type CollabAccess = {
  role: CollabRole;
  identity: CollabIdentity;
  projectName: string;
  ownerEmail?: string;
  via: "owner" | "share";
};

export class CollabAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "CollabAccessError";
    this.status = status;
  }
}

type AccessInput = {
  projectId: string;
  token?: string | null;
  clientId?: string | null;
  guestName?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
};

type CachedProject = {
  projectName: string;
  userEmail: string;
  expiresAt: number;
};

const projectCache = new Map<string, CachedProject>();
const PROJECT_CACHE_MS = 20_000;

/** Drop cached ownership data after a rename, trash, restore or purge. */
export function invalidateProjectAccess(projectId: string): void {
  projectCache.delete(projectId);
}

export function cleanClientId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(trimmed)) return null;
  return trimmed;
}

export function cleanDisplayName(value: unknown): string {
  if (typeof value !== "string") return "Guest";
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  return cleaned || "Guest";
}

function cleanColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function cleanAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString().slice(0, 500) : undefined;
  } catch {
    return undefined;
  }
}

async function loadProject(projectId: string): Promise<CachedProject> {
  const cached = projectCache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
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

    if (!rows[0]) {
      throw new CollabAccessError("That board no longer exists.", 404);
    }

    const project = {
      projectName: rows[0].projectName,
      userEmail: rows[0].userEmail,
      expiresAt: Date.now() + PROJECT_CACHE_MS,
    };
    projectCache.set(projectId, project);
    return project;
  } catch (error) {
    if (error instanceof CollabAccessError) throw error;
    throw new CollabAccessError(
      "The board database is unavailable. Try again in a moment.",
      503
    );
  }
}

async function loadClerkIdentity(): Promise<{
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
} | null> {
  try {
    const session = await auth();
    if (!session?.userId) return null;
    const user = await currentUser();
    if (!user) return null;

    const email = user.primaryEmailAddress?.emailAddress || "";
    const name =
      user.fullName ||
      user.username ||
      email.split("@")[0] ||
      "Teammate";

    return {
      id: user.id,
      email,
      name,
      avatarUrl: user.imageUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Owners come from Clerk + the projects table. External collaborators come
 * from a signed share token, so links keep working without a Clerk session.
 */
export async function resolveCollabAccess(
  input: AccessInput
): Promise<CollabAccess> {
  const projectId = input.projectId?.trim();
  if (!projectId) {
    throw new CollabAccessError("Missing projectId.", 400);
  }

  const share = input.token ? verifyShareToken(input.token) : null;
  const shareMatches = Boolean(share && share.projectId === projectId);
  const clerk = await loadClerkIdentity();

  let role: CollabRole | null = null;
  let projectName = shareMatches ? share!.projectName : "Untitled board";
  let ownerEmail: string | undefined;
  let via: "owner" | "share" = "share";

  if (clerk) {
    try {
      const project = await loadProject(projectId);
      ownerEmail = project.userEmail;
      projectName = project.projectName;
      if (project.userEmail === clerk.email) {
        role = "owner";
        via = "owner";
      }
    } catch (error) {
      // A deleted board must stay closed even when someone holds an old link.
      if (error instanceof CollabAccessError && error.status === 404) {
        throw error;
      }
      // A valid share link is enough to keep collaborating during a database
      // hiccup. Without one, the owner check cannot be trusted.
      if (!shareMatches) {
        throw error;
      }
    }
  } else if (shareMatches) {
    // Guests do not have a Clerk session, so verify that the shared board has
    // not been moved to the recycle bin. If the database is unavailable we keep
    // the signed token usable against the in-memory collaboration hub.
    try {
      const project = await loadProject(projectId);
      projectName = project.projectName || projectName;
    } catch (error) {
      if (error instanceof CollabAccessError && error.status === 404) {
        throw error;
      }
    }
  }

  if (!role && shareMatches) {
    role = share!.permission === "edit" ? "editor" : "viewer";
    projectName = share!.projectName || projectName;
    via = "share";
  }

  if (!role) {
    if (!clerk) {
      throw new CollabAccessError(
        "Sign in or use a valid share link to open this board.",
        401
      );
    }
    throw new CollabAccessError(
      "This board belongs to another workspace. Ask the owner for a share link.",
      403
    );
  }

  const clientId = cleanClientId(input.clientId) || "anonymous-client";
  const name = cleanDisplayName(input.guestName || clerk?.name);
  const identityId = clerk?.id || `guest:${clientId}`;
  const fallbackColor = colorForIdentity(identityId).stroke;
  const color = cleanColor(input.color) || fallbackColor;

  return {
    role,
    via,
    projectName,
    ownerEmail,
    identity: {
      id: identityId,
      name: clerk?.name || name,
      color,
      avatarUrl: cleanAvatarUrl(clerk?.avatarUrl || input.avatarUrl),
      isGuest: !clerk,
    },
  };
}

export function canEdit(access: CollabAccess): boolean {
  return access.role === "owner" || access.role === "editor";
}
