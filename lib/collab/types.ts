import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

export type CollabRole = "owner" | "editor" | "viewer";

export type SharePermission = "edit" | "view";

export type CollabIdentity = {
  /** Stable per browser/account id used for presence. */
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  isGuest: boolean;
};

export type CollaboratorPresence = {
  clientId: string;
  identityId: string;
  name: string;
  color: string;
  avatarUrl?: string;
  pointer?: {
    x: number;
    y: number;
    tool: "pointer" | "laser";
  };
  button?: "up" | "down";
  selectedElementIds?: Record<string, true>;
  activeTool?: string;
  pageVisible?: boolean;
  joinedAt: number;
  lastSeen: number;
};

export type PersistedDoc = {
  title: string;
  content: string;
  updatedAt: number;
  updatedBy?: string;
};

export type SceneSnapshot = {
  elements: ExcalidrawElement[];
  files: BinaryFiles;
  appState: Record<string, unknown>;
  doc: PersistedDoc | null;
  revision: number;
  updatedAt: string | null;
  persisted: boolean;
};

export type SceneChanges = {
  elements: ExcalidrawElement[];
  files?: BinaryFiles;
  doc?: PersistedDoc;
  revision: number;
  updatedBy?: string;
  sourceClientId?: string;
};

export type CollabHello = {
  participants: CollaboratorPresence[];
  revision: number;
  role: CollabRole;
  projectName: string;
};

export type CollabSceneEvent = {
  type: "scene";
  changes: SceneChanges;
};

export type CollabPresenceEvent = {
  type: "presence";
  participants: CollaboratorPresence[];
};

export type CollabHelloEvent = {
  type: "hello";
  hello: CollabHello;
};

export type CollabEvent =
  | CollabSceneEvent
  | CollabPresenceEvent
  | CollabHelloEvent;

export type CollabSceneResponse = SceneSnapshot & {
  role: CollabRole;
  projectName: string;
  ownerName?: string;
  participants: CollaboratorPresence[];
  accessDenied?: boolean;
};

export type ScenePushInput = {
  projectId: string;
  elements?: ExcalidrawElement[];
  files?: BinaryFiles;
  appState?: Record<string, unknown>;
  doc?: PersistedDoc | null;
};
