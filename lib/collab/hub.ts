import type {
  CollabEvent,
  CollaboratorPresence,
  SceneSnapshot,
} from "./types";

type LatestScene = SceneSnapshot & { sourceClientId?: string };

type Subscriber = {
  clientId: string;
  send: (event: CollabEvent) => void;
};

type ProjectRoom = {
  presence: Map<string, CollaboratorPresence>;
  subscribers: Map<string, Subscriber>;
  latestScene: LatestScene | null;
  revision: number;
};

type Hub = Map<string, ProjectRoom>;

const PRESENCE_TTL_MS = 45_000;
const GLOBAL_KEY = "__scribeboard_collab_hub_v1";

function getHub(): Hub {
  const scope = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Hub;
  };
  if (!scope[GLOBAL_KEY]) {
    scope[GLOBAL_KEY] = new Map();
  }
  return scope[GLOBAL_KEY];
}

function getRoom(projectId: string): ProjectRoom {
  const hub = getHub();
  let room = hub.get(projectId);
  if (!room) {
    room = {
      presence: new Map(),
      subscribers: new Map(),
      latestScene: null,
      revision: 0,
    };
    hub.set(projectId, room);
  }
  return room;
}

export function nextRevision(projectId: string): number {
  const room = getRoom(projectId);
  room.revision = Math.max(room.revision + 1, Date.now());
  return room.revision;
}

export function getRoomRevision(projectId: string): number {
  const room = getRoom(projectId);
  return Math.max(room.revision, room.latestScene?.revision || 0);
}

function prunePresence(room: ProjectRoom): void {
  const now = Date.now();
  for (const [clientId, presence] of room.presence) {
    if (now - presence.lastSeen > PRESENCE_TTL_MS) {
      room.presence.delete(clientId);
    }
  }
}

export function listPresence(projectId: string): CollaboratorPresence[] {
  const room = getRoom(projectId);
  prunePresence(room);
  return Array.from(room.presence.values()).sort(
    (a, b) => a.joinedAt - b.joinedAt
  );
}

function broadcast(room: ProjectRoom, event: CollabEvent): void {
  for (const [clientId, subscriber] of room.subscribers) {
    try {
      subscriber.send(event);
    } catch {
      room.subscribers.delete(clientId);
    }
  }
}

function broadcastPresence(room: ProjectRoom): void {
  broadcast(room, {
    type: "presence",
    participants: Array.from(room.presence.values()).sort(
      (a, b) => a.joinedAt - b.joinedAt
    ),
  });
}

function presenceChanged(
  previous: CollaboratorPresence | undefined,
  next: CollaboratorPresence
): boolean {
  if (!previous) return true;
  return (
    previous.name !== next.name ||
    previous.color !== next.color ||
    previous.avatarUrl !== next.avatarUrl ||
    previous.button !== next.button ||
    previous.activeTool !== next.activeTool ||
    previous.pageVisible !== next.pageVisible ||
    previous.pointer?.x !== next.pointer?.x ||
    previous.pointer?.y !== next.pointer?.y ||
    previous.pointer?.tool !== next.pointer?.tool ||
    JSON.stringify(previous.selectedElementIds || {}) !==
      JSON.stringify(next.selectedElementIds || {})
  );
}

export function upsertPresence(
  projectId: string,
  presence: CollaboratorPresence
): CollaboratorPresence[] {
  const room = getRoom(projectId);
  const previous = room.presence.get(presence.clientId);
  const next: CollaboratorPresence = {
    ...presence,
    joinedAt: previous?.joinedAt || presence.joinedAt || Date.now(),
    lastSeen: Date.now(),
  };
  room.presence.set(next.clientId, next);

  if (presenceChanged(previous, next)) {
    broadcastPresence(room);
  }

  return Array.from(room.presence.values()).sort(
    (a, b) => a.joinedAt - b.joinedAt
  );
}

export function touchPresence(projectId: string, clientId: string): void {
  const room = getRoom(projectId);
  const presence = room.presence.get(clientId);
  if (presence) {
    room.presence.set(clientId, { ...presence, lastSeen: Date.now() });
  }
}

export function removePresence(projectId: string, clientId: string): void {
  const room = getRoom(projectId);
  if (room.presence.delete(clientId)) {
    broadcastPresence(room);
  }
}

export function subscribe(
  projectId: string,
  subscriber: Subscriber
): () => void {
  const room = getRoom(projectId);
  room.subscribers.set(subscriber.clientId, subscriber);
  return () => {
    room.subscribers.delete(subscriber.clientId);
  };
}

export function setLatestScene(
  projectId: string,
  snapshot: LatestScene
): void {
  const room = getRoom(projectId);
  room.latestScene = snapshot;
  room.revision = Math.max(room.revision, snapshot.revision);
}

export function getLatestScene(projectId: string): LatestScene | null {
  return getRoom(projectId).latestScene;
}

export function broadcastScene(
  projectId: string,
  changes: {
    elements: SceneSnapshot["elements"];
    files?: SceneSnapshot["files"];
    doc?: SceneSnapshot["doc"];
    revision: number;
    updatedBy?: string;
    sourceClientId?: string;
  }
): void {
  const room = getRoom(projectId);
  room.revision = Math.max(room.revision, changes.revision);
  broadcast(room, {
    type: "scene",
    changes: {
      elements: changes.elements,
      files: changes.files,
      doc: changes.doc || undefined,
      revision: changes.revision,
      updatedBy: changes.updatedBy,
      sourceClientId: changes.sourceClientId,
    },
  });
}
