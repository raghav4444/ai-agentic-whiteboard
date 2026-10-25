import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { PersistedDoc } from "./types";

const COLLAB_PALETTE = [
  { background: "#d8f5e6", stroke: "#065f46" },
  { background: "#fdecc8", stroke: "#8a5a0b" },
  { background: "#e3edf5", stroke: "#2f5d7c" },
  { background: "#f8e3df", stroke: "#984434" },
  { background: "#ece5f8", stroke: "#5a468c" },
  { background: "#f1e6d8", stroke: "#775633" },
  { background: "#e2f0ea", stroke: "#247056" },
  { background: "#f6e4ee", stroke: "#8c3d66" },
] as const;

const PERSISTED_APP_STATE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "theme",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemStrokeStyle",
  "currentItemRoughness",
  "currentItemOpacity",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemTextAlign",
  "currentItemStartArrowhead",
  "currentItemEndArrowhead",
] as const;

const MAX_ELEMENTS = 2_000;
const MAX_FILES = 120;
const MAX_FILE_CHARS = 4_500_000;
const MAX_DOC_CONTENT = 250_000;

const ELEMENT_TYPES = new Set<ExcalidrawElement["type"]>([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "freedraw",
  "text",
  "image",
  "frame",
  "magicframe",
  "iframe",
  "embeddable",
]);

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function colorForIdentity(seed: string): { background: string; stroke: string } {
  return COLLAB_PALETTE[hashString(seed) % COLLAB_PALETTE.length];
}

export function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function elementVersion(element: ExcalidrawElement): {
  version: number;
  versionNonce: number;
  updated: number;
} {
  return {
    version: typeof element.version === "number" ? element.version : 0,
    versionNonce:
      typeof element.versionNonce === "number" ? element.versionNonce : 0,
    updated: typeof element.updated === "number" ? element.updated : 0,
  };
}

/**
 * Excalidraw's collaboration rule: the higher version wins. Equal versions are
 * resolved by the lower nonce so every peer reaches the same result.
 */
function pickElement(
  local: ExcalidrawElement,
  remote: ExcalidrawElement
): ExcalidrawElement {
  const a = elementVersion(local);
  const b = elementVersion(remote);

  if (a.version !== b.version) return a.version > b.version ? local : remote;
  if (a.versionNonce !== b.versionNonce) {
    return a.versionNonce < b.versionNonce ? local : remote;
  }
  if (a.updated !== b.updated) return a.updated >= b.updated ? local : remote;
  return local;
}

function sameElement(a: ExcalidrawElement, b: ExcalidrawElement): boolean {
  const av = elementVersion(a);
  const bv = elementVersion(b);
  return (
    a.id === b.id &&
    av.version === bv.version &&
    av.versionNonce === bv.versionNonce &&
    Boolean(a.isDeleted) === Boolean(b.isDeleted)
  );
}

export function sanitizeElements(value: unknown): ExcalidrawElement[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: ExcalidrawElement[] = [];

  for (const candidate of value) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      result.length >= MAX_ELEMENTS
    ) {
      continue;
    }

    const element = candidate as ExcalidrawElement;
    if (
      typeof element.id !== "string" ||
      element.id.length === 0 ||
      element.id.length > 160 ||
      typeof element.type !== "string" ||
      !ELEMENT_TYPES.has(element.type) ||
      seen.has(element.id)
    ) {
      continue;
    }

    // Older caches and hand-built diagram skeletons may omit Excalidraw's
    // numeric version fields. Normalize them so scene version math never
    // becomes NaN (which makes every change look dirty and loops sync).
    const version =
      typeof element.version === "number" && Number.isFinite(element.version)
        ? element.version
        : 0;
    const versionNonce =
      typeof element.versionNonce === "number" &&
      Number.isFinite(element.versionNonce)
        ? element.versionNonce
        : 0;
    const updated =
      typeof element.updated === "number" && Number.isFinite(element.updated)
        ? element.updated
        : 0;

    // Excalidraw assumes these collections and paint fields exist. A missing
    // groupIds array crashes selection, while a missing background color
    // crashes hit-testing for every collaborator receiving the scene.
    const groupIds = Array.isArray(element.groupIds)
      ? element.groupIds.filter((id) => typeof id === "string")
      : [];
    const boundElements = Array.isArray(element.boundElements)
      ? element.boundElements
      : [];
    const index =
      typeof element.index === "string" ? element.index : null;
    const roundness =
      element.roundness &&
      typeof element.roundness === "object" &&
      typeof element.roundness.type === "number"
        ? element.roundness
        : null;

    seen.add(element.id);
    result.push({
      ...element,
      version,
      versionNonce,
      updated,
      x: finiteNumber(element.x, 0),
      y: finiteNumber(element.y, 0),
      width: finiteNumber(element.width, 0),
      height: finiteNumber(element.height, 0),
      angle: finiteNumber(element.angle, 0),
      seed: finiteNumber(element.seed, hashString(element.id)),
      strokeColor:
        typeof element.strokeColor === "string"
          ? element.strokeColor
          : "#1e1e1e",
      backgroundColor:
        typeof element.backgroundColor === "string"
          ? element.backgroundColor
          : "transparent",
      fillStyle: isOneOf(
        element.fillStyle,
        ["hachure", "cross-hatch", "solid", "zigzag"] as const
      )
        ? element.fillStyle
        : "solid",
      strokeWidth: finiteNumber(element.strokeWidth, 1),
      strokeStyle: isOneOf(
        element.strokeStyle,
        ["solid", "dashed", "dotted"] as const
      )
        ? element.strokeStyle
        : "solid",
      roughness: finiteNumber(element.roughness, 1),
      opacity: Math.min(100, Math.max(0, finiteNumber(element.opacity, 100))),
      groupIds,
      boundElements,
      index,
      roundness,
      isDeleted: Boolean(element.isDeleted),
      locked: Boolean(element.locked),
      link: typeof element.link === "string" ? element.link : null,
      frameId: typeof element.frameId === "string" ? element.frameId : null,
    } as ExcalidrawElement);
  }

  return result;
}

export function mergeSceneElements(
  existing: readonly ExcalidrawElement[],
  incoming: readonly ExcalidrawElement[]
): { elements: ExcalidrawElement[]; changed: ExcalidrawElement[] } {
  const existingById = new Map(existing.map((element) => [element.id, element]));
  const seen = new Set<string>();
  const elements: ExcalidrawElement[] = [];
  const changed: ExcalidrawElement[] = [];

  // Incoming order wins so z-order changes made by an editor are preserved.
  for (const remote of incoming) {
    if (seen.has(remote.id)) continue;
    seen.add(remote.id);

    const local = existingById.get(remote.id);
    if (!local) {
      elements.push(remote);
      changed.push(remote);
      continue;
    }

    const winner = pickElement(local, remote);
    elements.push(winner);
    if (!sameElement(winner, local)) changed.push(winner);
  }

  for (const local of existing) {
    if (seen.has(local.id)) continue;
    seen.add(local.id);
    elements.push(local);
  }

  return { elements, changed };
}

export function mergeBinaryFiles(
  existing: BinaryFiles | undefined,
  incoming: BinaryFiles | undefined
): { files: BinaryFiles; changed: BinaryFiles } {
  const files: BinaryFiles = { ...(existing || {}) };
  const changed: BinaryFiles = {};

  if (!incoming) return { files, changed };

  let count = Object.keys(files).length;
  for (const [id, file] of Object.entries(incoming)) {
    if (!file || typeof file !== "object") continue;
    const existingFile = files[id];
    if (!existingFile && count >= MAX_FILES) continue;
    if (
      typeof file.dataURL === "string" &&
      file.dataURL.length > MAX_FILE_CHARS
    ) {
      continue;
    }
    if (existingFile !== file) {
      files[id] = file;
      changed[id] = file;
    }
    if (!existingFile) count += 1;
  }

  return { files, changed };
}

export function sanitizeDoc(value: unknown): PersistedDoc | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.slice(0, 160) : "";
  const content =
    typeof record.content === "string"
      ? record.content.slice(0, MAX_DOC_CONTENT)
      : "";
  const updatedAt =
    typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : Date.now();
  const updatedBy =
    typeof record.updatedBy === "string"
      ? record.updatedBy.slice(0, 64)
      : undefined;

  if (!title && !content) return null;
  return { title, content, updatedAt, updatedBy };
}

export function mergeDoc(
  existing: PersistedDoc | null,
  incoming: PersistedDoc | null | undefined
): PersistedDoc | null {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return incoming.updatedAt >= existing.updatedAt ? incoming : existing;
}

export function extractDocFromAppState(
  appState: Record<string, unknown> | null | undefined
): PersistedDoc | null {
  if (!appState || typeof appState !== "object") return null;
  return sanitizeDoc(appState.__smartdoc);
}

export function pickPersistedAppState(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, unknown> = {};

  for (const key of PERSISTED_APP_STATE_KEYS) {
    if (value[key] !== undefined) result[key] = value[key];
  }

  const doc = sanitizeDoc(value.__smartdoc);
  if (doc) result.__smartdoc = doc;

  return result;
}

export function mergePersistedAppState(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base = pickPersistedAppState(existing);
  const next = pickPersistedAppState(incoming);

  const doc = mergeDoc(extractDocFromAppState(base), extractDocFromAppState(next));
  const merged: Record<string, unknown> = { ...base, ...next };
  if (doc) merged.__smartdoc = doc;
  else delete merged.__smartdoc;

  return merged;
}

export function sceneSignature(elements: readonly ExcalidrawElement[]): string {
  let hash = 2166136261;
  for (const element of elements) {
    const version = elementVersion(element);
    const token = `${element.id}:${version.version}:${version.versionNonce}:${
      element.isDeleted ? 1 : 0
    };`;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `${elements.length}:${hash >>> 0}`;
}

export function hasNewerElements(
  local: readonly ExcalidrawElement[],
  remote: readonly ExcalidrawElement[]
): boolean {
  if (local.length !== remote.length) return true;
  const localById = new Map(local.map((element) => [element.id, element]));

  for (const element of remote) {
    const current = localById.get(element.id);
    if (!current || !sameElement(current, element)) return true;
  }

  return false;
}
