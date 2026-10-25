import { eq } from "drizzle-orm";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { db, WhiteboardData } from "@/db";
import {
  extractDocFromAppState,
  mergeBinaryFiles,
  mergeDoc,
  mergePersistedAppState,
  mergeSceneElements,
  pickPersistedAppState,
  sanitizeDoc,
  sanitizeElements,
} from "./merge";
import {
  getLatestScene,
  nextRevision,
  setLatestScene,
} from "./hub";
import type {
  PersistedDoc,
  ScenePushInput,
  SceneSnapshot,
} from "./types";

let hasWarnedAboutPersistence = false;

function revisionOf(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "number") return value;
  return 0;
}

function emptySnapshot(): SceneSnapshot {
  return {
    elements: [],
    files: {},
    appState: {},
    doc: null,
    revision: 0,
    updatedAt: null,
    persisted: true,
  };
}

function warnPersistence(error: unknown): void {
  if (hasWarnedAboutPersistence) return;
  hasWarnedAboutPersistence = true;
  console.warn(
    "[collab] Database persistence is unavailable; keeping this session in the in-memory collaboration hub.",
    error instanceof Error ? error.message : error
  );
}

export async function loadCollabScene(projectId: string): Promise<SceneSnapshot> {
  const latest = getLatestScene(projectId);

  try {
    const rows = await db
      .select()
      .from(WhiteboardData)
      .where(eq(WhiteboardData.projectId, projectId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      if (latest) return latest;
      return emptySnapshot();
    }

    const dbRevision = revisionOf(row.updatedAt);
    if (latest && latest.revision >= dbRevision) {
      return latest;
    }

    const appState = pickPersistedAppState(
      (row.appState || {}) as Record<string, unknown>
    );
    const snapshot: SceneSnapshot = {
      elements: sanitizeElements(row.elements),
      files: mergeBinaryFiles(undefined, row.files as BinaryFiles).files,
      appState,
      doc: extractDocFromAppState(appState),
      revision: dbRevision,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      persisted: true,
    };

    setLatestScene(projectId, snapshot);
    return snapshot;
  } catch (error) {
    warnPersistence(error);
    if (latest) return latest;
    return { ...emptySnapshot(), persisted: false };
  }
}

export async function saveCollabScene(
  input: ScenePushInput,
  options: {
    updatedBy?: string;
    sourceClientId?: string;
  } = {}
): Promise<{
  snapshot: SceneSnapshot;
  changedElements: SceneSnapshot["elements"];
  changedFiles: SceneSnapshot["files"];
  changedDoc: PersistedDoc | null;
}> {
  const existing = await loadCollabScene(input.projectId);

  const incomingElements = Array.isArray(input.elements)
    ? sanitizeElements(input.elements)
    : null;
  const mergedElements = incomingElements
    ? mergeSceneElements(existing.elements, incomingElements)
    : { elements: existing.elements, changed: [] as SceneSnapshot["elements"] };

  const filesResult =
    input.files === undefined
      ? { files: existing.files, changed: {} }
      : mergeBinaryFiles(existing.files, input.files);

  const mergedAppState =
    input.appState === undefined
      ? { ...existing.appState }
      : mergePersistedAppState(existing.appState, input.appState);

  const incomingDoc =
    input.doc === undefined ? undefined : sanitizeDoc(input.doc);
  const mergedDoc =
    input.doc === undefined
      ? existing.doc
      : mergeDoc(existing.doc, incomingDoc);

  if (mergedDoc) {
    mergedAppState.__smartdoc = mergedDoc;
  }

  const revision = nextRevision(input.projectId);
  const updatedAt = new Date(revision).toISOString();
  const snapshot: SceneSnapshot = {
    elements: mergedElements.elements,
    files: filesResult.files,
    appState: mergedAppState,
    doc: mergedDoc,
    revision,
    updatedAt,
    persisted: true,
  };

  // Publish before awaiting the database so simultaneous editors feel the
  // change immediately even if persistence is slow or unavailable.
  setLatestScene(input.projectId, {
    ...snapshot,
    sourceClientId: options.sourceClientId,
  });

  try {
    await db
      .insert(WhiteboardData)
      .values({
        projectId: input.projectId,
        elements: snapshot.elements,
        appState: snapshot.appState,
        files: snapshot.files,
        updatedAt: new Date(revision),
      })
      .onConflictDoUpdate({
        target: WhiteboardData.projectId,
        set: {
          elements: snapshot.elements,
          appState: snapshot.appState,
          files: snapshot.files,
          updatedAt: new Date(revision),
        },
      });
  } catch (error) {
    warnPersistence(error);
    snapshot.persisted = false;
  }

  return {
    snapshot,
    changedElements: mergedElements.changed,
    changedFiles: filesResult.changed,
    changedDoc:
      mergedDoc && mergedDoc !== existing.doc ? mergedDoc : null,
  };
}
