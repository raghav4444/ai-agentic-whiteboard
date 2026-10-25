"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { colorForIdentity } from "@/lib/collab/merge";
import type {
  CollabIdentity,
  CollabRole,
  CollabSceneResponse,
  CollaboratorPresence,
  PersistedDoc,
  SceneChanges,
} from "@/lib/collab/types";

export type ConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

export type StorageMode = "cloud" | "session" | "device";

export type PresenceInput = {
  pointer?: { x: number; y: number; tool: "pointer" | "laser" };
  button?: "up" | "down";
  selectedElementIds?: Record<string, true>;
  activeTool?: string;
  force?: boolean;
};

export type ScenePush = {
  elements?: ExcalidrawElement[];
  files?: BinaryFiles;
  appState?: Record<string, unknown>;
};

export type CollabSession = {
  projectId: string;
  shareToken?: string;
  clientId: string | null;
  identity: CollabIdentity | null;
  role: CollabRole;
  participants: CollaboratorPresence[];
  connection: ConnectionStatus;
  syncStatus: SyncStatus;
  storageMode: StorageMode;
  accessError: string | null;
  doc: PersistedDoc | null;
  projectName: string;
  isGuest: boolean;
  guestName: string;
  setGuestName: (name: string) => void;
  fetchSnapshot: () => Promise<CollabSceneResponse | null>;
  pushScene: (input: ScenePush) => Promise<CollabSceneResponse | null>;
  pushDoc: (doc: PersistedDoc) => Promise<PersistedDoc | null>;
  sendPresence: (input: PresenceInput) => void;
  subscribeToScene: (listener: (changes: SceneChanges) => void) => () => void;
  reportSyncStatus: (status: SyncStatus) => void;
};

type Options = {
  projectId: string;
  shareToken?: string;
  projectName?: string;
  initialRole?: CollabRole;
};

const PRESENCE_INTERVAL_MS = 85;
const POLL_INTERVAL_MS = 7_000;

function cleanName(value: string): string {
  return (
    value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 32) || "Guest"
  );
}

function randomClientId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return uuid.replace(/[^A-Za-z0-9]/g, "").slice(0, 32) || "guestclient";
}

function newerDoc(
  current: PersistedDoc | null,
  incoming: PersistedDoc | null | undefined
): PersistedDoc | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.updatedAt >= current.updatedAt ? incoming : current;
}

export function useCollabSession({
  projectId,
  shareToken,
  projectName: initialProjectName,
  initialRole,
}: Options): CollabSession {
  const { user, isLoaded } = useUser();
  const [clientId, setClientId] = useState<string | null>(null);
  const [guestName, setGuestNameState] = useState("Guest");
  const [role, setRole] = useState<CollabRole>(
    initialRole || (shareToken ? "editor" : "owner")
  );
  const [participants, setParticipants] = useState<CollaboratorPresence[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [storageMode, setStorageMode] = useState<StorageMode>("cloud");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [doc, setDoc] = useState<PersistedDoc | null>(null);
  const [projectName, setProjectName] = useState(
    initialProjectName || "Untitled board"
  );

  const roleRef = useRef(role);
  const clientIdRef = useRef<string | null>(null);
  const guestNameRef = useRef("Guest");
  const docRef = useRef<PersistedDoc | null>(null);
  const lastRevisionRef = useRef(0);
  const listenersRef = useRef(new Set<(changes: SceneChanges) => void>());
  const presenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPresenceAtRef = useRef(0);
  const pendingPresenceRef = useRef<PresenceInput | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    guestNameRef.current = guestName;
  }, [guestName]);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // The per-tab guest identity lives in browser storage, which React cannot
  // read during render. Hydrating it here is an external-store read.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let storedClientId: string | null = null;
    let storedGuestName: string | null = null;

    try {
      // sessionStorage is tab-scoped, so two tabs on the same browser get two
      // distinct live cursors. Only fall back to the shared localStorage id
      // when sessionStorage itself is unavailable.
      storedClientId = sessionStorage.getItem("scribeboard:collab:client-id");
      if (!storedClientId) {
        storedClientId = randomClientId();
        sessionStorage.setItem("scribeboard:collab:client-id", storedClientId);
        localStorage.setItem("scribeboard:collab:client-id", storedClientId);
      }
      storedGuestName = localStorage.getItem("scribeboard:collab:guest-name");
    } catch {
      try {
        storedClientId = localStorage.getItem("scribeboard:collab:client-id");
      } catch {
        storedClientId = null;
      }
      if (!storedClientId) storedClientId = randomClientId();
    }

    setClientId(storedClientId);
    setGuestNameState(
      storedGuestName
        ? cleanName(storedGuestName)
        : `Guest ${storedClientId.slice(0, 4).toUpperCase()}`
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const identity = useMemo<CollabIdentity | null>(() => {
    if (!isLoaded || !clientId) return null;

    if (user) {
      const name =
        user.fullName ||
        user.username ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "Teammate";
      return {
        id: user.id,
        name,
        color: colorForIdentity(user.id).stroke,
        avatarUrl: user.imageUrl,
        isGuest: false,
      };
    }

    const id = `guest:${clientId}`;
    return {
      id,
      name: cleanName(guestName),
      color: colorForIdentity(id).stroke,
      isGuest: true,
    };
  }, [clientId, guestName, isLoaded, user]);

  const setGuestName = useCallback((name: string) => {
    const cleaned = cleanName(name);
    setGuestNameState(cleaned);
    try {
      localStorage.setItem("scribeboard:collab:guest-name", cleaned);
    } catch {
      // Storage can be unavailable in private browsing; the session still works.
    }
  }, []);

  const notifyScene = useCallback((changes: SceneChanges) => {
    if (changes.revision > lastRevisionRef.current) {
      lastRevisionRef.current = changes.revision;
    }
    if (changes.doc) {
      setDoc((current) => newerDoc(current, changes.doc));
    }
    for (const listener of listenersRef.current) {
      try {
        listener(changes);
      } catch (error) {
        console.error("Collaboration listener failed:", error);
      }
    }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (!projectId) return null;

    const params = new URLSearchParams({ projectId });
    if (shareToken) params.set("share", shareToken);
    if (clientIdRef.current) params.set("clientId", clientIdRef.current);
    if (guestNameRef.current) params.set("name", guestNameRef.current);

    try {
      const response = await fetch(`/api/collab/state?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | (CollabSceneResponse & { error?: string })
        | null;

      if (!response.ok || !data || data.error) {
        const message = data?.error || "Could not join this board.";
        setAccessError(message);
        setConnection("offline");
        return null;
      }

      setAccessError(null);
      setRole(data.role);
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
      setProjectName(data.projectName || initialProjectName || "Untitled board");
      setStorageMode(data.persisted ? "cloud" : "session");
      setDoc((current) => newerDoc(current, data.doc));
      if (data.revision > lastRevisionRef.current) {
        lastRevisionRef.current = data.revision;
      }
      return data;
    } catch (error) {
      console.error("Collaboration snapshot failed:", error);
      setConnection((current) =>
        current === "live" ? current : "reconnecting"
      );
      return null;
    }
  }, [initialProjectName, projectId, shareToken]);

  const pushScene = useCallback(
    async (input: ScenePush) => {
      if (!projectId || roleRef.current === "viewer") return null;

      const payload = {
        projectId,
        shareToken,
        clientId: clientIdRef.current,
        guestName: guestNameRef.current,
        elements: input.elements,
        files: input.files,
        appState: input.appState,
      };

      try {
        const response = await fetch("/api/collab/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) as
          | (CollabSceneResponse & { error?: string })
          | null;

        if (!response.ok || !data || data.error) {
          if (response.status === 401 || response.status === 403) {
            setAccessError(data?.error || "You cannot edit this board.");
          }
          setSyncStatus("offline");
          return null;
        }

        setAccessError(null);
        setRole(data.role);
        setParticipants(Array.isArray(data.participants) ? data.participants : []);
        setStorageMode(data.persisted ? "cloud" : "session");
        setDoc((current) => newerDoc(current, data.doc));
        if (data.revision > lastRevisionRef.current) {
          lastRevisionRef.current = data.revision;
        }
        setSyncStatus(data.persisted ? "saved" : "saved");
        return data;
      } catch (error) {
        console.error("Collaboration sync failed:", error);
        setSyncStatus("offline");
        setConnection((current) =>
          current === "live" ? current : "reconnecting"
        );
        return null;
      }
    },
    [projectId, shareToken]
  );

  const pushDoc = useCallback(
    async (nextDoc: PersistedDoc) => {
      if (!projectId || roleRef.current === "viewer") return null;

      try {
        const response = await fetch("/api/collab/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            shareToken,
            clientId: clientIdRef.current,
            guestName: guestNameRef.current,
            doc: nextDoc,
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | (CollabSceneResponse & { error?: string })
          | null;

        if (!response.ok || !data || data.error) {
          setSyncStatus("offline");
          return null;
        }

        setStorageMode(data.persisted ? "cloud" : "session");
        const merged = newerDoc(nextDoc, data.doc);
        setDoc(merged);
        return merged;
      } catch (error) {
        console.error("Document sync failed:", error);
        setSyncStatus("offline");
        return null;
      }
    },
    [projectId, shareToken]
  );

  const flushPresence = useCallback(() => {
    const payload = pendingPresenceRef.current;
    if (!payload || !projectId) return;

    pendingPresenceRef.current = null;
    lastPresenceAtRef.current = Date.now();

    const body = JSON.stringify({
      projectId,
      shareToken,
      clientId: clientIdRef.current,
      guestName: guestNameRef.current,
      pointer: payload.pointer,
      button: payload.button,
      selectedElementIds: payload.selectedElementIds,
      activeTool: payload.activeTool,
      pageVisible: typeof document !== "undefined"
        ? document.visibilityState === "visible"
        : true,
    });

    void fetch("/api/collab/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Presence is best-effort; scene sync reports connectivity separately.
    });
  }, [projectId, shareToken]);

  const sendPresence = useCallback(
    (input: PresenceInput) => {
      pendingPresenceRef.current = {
        ...pendingPresenceRef.current,
        ...input,
      };

      const elapsed = Date.now() - lastPresenceAtRef.current;
      if (input.force || elapsed >= PRESENCE_INTERVAL_MS) {
        if (presenceTimerRef.current) {
          clearTimeout(presenceTimerRef.current);
          presenceTimerRef.current = null;
        }
        flushPresence();
        return;
      }

      if (!presenceTimerRef.current) {
        presenceTimerRef.current = setTimeout(() => {
          presenceTimerRef.current = null;
          flushPresence();
        }, PRESENCE_INTERVAL_MS - elapsed);
      }
    },
    [flushPresence]
  );

  const subscribeToScene = useCallback(
    (listener: (changes: SceneChanges) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  const reportSyncStatus = useCallback((status: SyncStatus) => {
    setSyncStatus(status);
  }, []);

  // Live presence and scene events. EventSource reconnects on its own, and the
  // fallback poll below covers multi-instance/serverless deployments.
  // The connection status mirrors the EventSource lifecycle, an external store.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!clientId || !identity) return;

    const params = new URLSearchParams({
      projectId,
      clientId,
      name: identity.name,
      color: identity.color,
    });
    if (shareToken) params.set("share", shareToken);

    const source = new EventSource(
      `/api/collab/stream?${params.toString()}`
    );
    setConnection("connecting");

    source.onopen = () => {
      setConnection("live");
    };

    source.addEventListener("hello", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          hello?: {
            participants?: CollaboratorPresence[];
            revision?: number;
            role?: CollabRole;
            projectName?: string;
          };
        };
        const hello = payload.hello;
        if (!hello) return;
        if (Array.isArray(hello.participants)) setParticipants(hello.participants);
        if (hello.revision && hello.revision > lastRevisionRef.current) {
          lastRevisionRef.current = hello.revision;
        }
        if (hello.role) setRole(hello.role);
        if (hello.projectName) setProjectName(hello.projectName);
        setConnection("live");
      } catch {
        // Ignore malformed events; the next snapshot repairs state.
      }
    });

    source.addEventListener("presence", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          participants?: CollaboratorPresence[];
        };
        if (Array.isArray(payload.participants)) {
          setParticipants(payload.participants);
        }
      } catch {
        // Ignore malformed presence events.
      }
    });

    source.addEventListener("scene", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          changes?: SceneChanges;
        };
        if (!payload.changes) return;
        if (payload.changes.sourceClientId === clientId) return;
        notifyScene(payload.changes);
      } catch {
        // Ignore malformed scene events.
      }
    });

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setConnection("offline");
      } else {
        setConnection("reconnecting");
      }
    };

    return () => {
      source.close();
    };
  }, [clientId, identity, notifyScene, projectId, shareToken]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Catch cross-instance changes and survive EventSource limitations. Polling
  // only runs while the tab is visible and uses the revision to skip no-ops.
  useEffect(() => {
    if (!clientId || !identity) return;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const previousRevision = lastRevisionRef.current;
      const snapshot = await fetchSnapshot();
      if (!snapshot) return;
      if (snapshot.revision > previousRevision) {
        notifyScene({
          elements: snapshot.elements,
          files: snapshot.files,
          doc: snapshot.doc || undefined,
          revision: snapshot.revision,
        });
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [clientId, fetchSnapshot, identity, notifyScene]);

  useEffect(() => {
    const handleOnline = () => setConnection("reconnecting");
    const handleOffline = () => setConnection("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    };
  }, []);

  return {
    projectId,
    shareToken,
    clientId,
    identity,
    role,
    participants,
    connection,
    syncStatus,
    storageMode,
    accessError,
    doc,
    projectName,
    isGuest: Boolean(identity?.isGuest),
    guestName,
    setGuestName,
    fetchSnapshot,
    pushScene,
    pushDoc,
    sendPresence,
    subscribeToScene,
    reportSyncStatus,
  };
}
