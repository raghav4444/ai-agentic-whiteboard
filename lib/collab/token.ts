import { createHmac, timingSafeEqual } from "node:crypto";
import type { SharePermission } from "./types";

export type ShareTokenPayload = {
  version: 1;
  projectId: string;
  projectName: string;
  permission: SharePermission;
  issuedAt: number;
};

const MAX_TOKEN_LENGTH = 2_400;
const MAX_PROJECT_ID_LENGTH = 160;
const MAX_PROJECT_NAME_LENGTH = 160;

function shareSecret(): string {
  const secret =
    process.env.SHARE_TOKEN_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error(
      "A server-only SHARE_TOKEN_SECRET or CLERK_SECRET_KEY is required to sign share links."
    );
  }
  return secret;
}

function encodePayload(payload: ShareTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", shareSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createShareToken(input: {
  projectId: string;
  projectName?: string;
  permission?: SharePermission;
}): string {
  const projectId = input.projectId.trim().slice(0, MAX_PROJECT_ID_LENGTH);
  if (!projectId) throw new Error("A projectId is required to create a share link.");

  const payload: ShareTokenPayload = {
    version: 1,
    projectId,
    projectName:
      input.projectName?.trim().slice(0, MAX_PROJECT_NAME_LENGTH) || "Untitled board",
    permission: input.permission === "view" ? "view" : "edit",
    issuedAt: Date.now(),
  };

  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyShareToken(token: unknown): ShareTokenPayload | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return null;

  const separator = trimmed.lastIndexOf(".");
  if (separator <= 0 || separator === trimmed.length - 1) return null;

  const encoded = trimmed.slice(0, separator);
  const providedSignature = trimmed.slice(separator + 1);
  const expectedSignature = sign(encoded);

  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<ShareTokenPayload>;

    if (
      parsed.version !== 1 ||
      typeof parsed.projectId !== "string" ||
      !parsed.projectId ||
      parsed.projectId.length > MAX_PROJECT_ID_LENGTH ||
      typeof parsed.projectName !== "string" ||
      parsed.projectName.length > MAX_PROJECT_NAME_LENGTH ||
      (parsed.permission !== "edit" && parsed.permission !== "view") ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null;
    }

    return {
      version: 1,
      projectId: parsed.projectId,
      projectName: parsed.projectName || "Untitled board",
      permission: parsed.permission,
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}

export function shareTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("x-share-token");
  if (header) return header;
  try {
    const url = new URL(request.url);
    return url.searchParams.get("share") || url.searchParams.get("shareToken");
  } catch {
    return null;
  }
}
