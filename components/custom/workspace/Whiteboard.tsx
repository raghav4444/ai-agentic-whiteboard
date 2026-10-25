"use client";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useState, useRef, useEffect, useCallback } from 'react';
import "./whiteboard.css"
import { reconcileElements, exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false }
);

import { toast } from '@/components/ui/toast';
import type {
    AppState,
    BinaryFiles,
    Collaborator,
    ExcalidrawImperativeAPI,
    LibraryItems,
    SocketId,
    ToolType,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
    MousePointer2,
    Hand,
    Square,
    Diamond,
    Circle,
    ArrowRight,
    Minus,
    Pencil,
    Type,
    Eraser,
    Sparkles,
    Loader2,
    Lock,
} from "@/lib/icons";
import FloatingProperties from "./FloatingProperties";
import { Button } from "@/components/ui/button"
import AIFloatingSidebar from "./AIFloatingSidebar";
import type { CollabSession } from "./useCollabSession";
import type { SceneChanges } from "@/lib/collab/types";
import {
    colorForIdentity,
    hasNewerElements,
    pickPersistedAppState,
    sanitizeElements,
} from "@/lib/collab/merge";

const tools = [
    { name: "Selection", icon: MousePointer2 },
    { name: "Hand", icon: Hand },
    { name: "Rectangle", icon: Square },
    { name: "Diamond", icon: Diamond },
    { name: "Ellipse", icon: Circle },
    { name: "Arrow", icon: ArrowRight },
    { name: "Line", icon: Minus },
    { name: "Draw", icon: Pencil },
    { name: "Text", icon: Type },
    { name: "Eraser", icon: Eraser },
]

const TOOL_NAME_MAP: Record<string, string> = {
    selection: "Selection",
    hand: "Hand",
    rectangle: "Rectangle",
    diamond: "Diamond",
    ellipse: "Ellipse",
    arrow: "Arrow",
    line: "Line",
    freedraw: "Draw",
    text: "Text",
    eraser: "Eraser",
};

const LIBRARY_STORAGE_KEY = "scribeboard:excalidraw-library:v1";
const MAX_CACHED_ELEMENTS_CHARS = 2_400_000;

type SaveStatus = "saved" | "saving" | "unsaved" | "offline";

type WhiteboardProps = {
    projectId: string;
    session: CollabSession;
    readOnly?: boolean;
};

function loadLibrary(): LibraryItems {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as LibraryItems) : [];
    } catch {
        return [];
    }
}

function sceneVersionOf(elements: readonly ExcalidrawElement[]): number {
    return elements.reduce((total, element) => {
        const version = element.version;
        return total + (typeof version === "number" && Number.isFinite(version) ? version : 0);
    }, 0);
}

function safeFilename(value: string): string {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "scribeboard-canvas"
    );
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

/**
 * Build a real PDF from the exported PNG without pulling a PDF library into
 * the client bundle. The canvas is encoded as a JPEG XObject, one page sized
 * to the image, with a normal xref table so every PDF reader can open it.
 */
async function pngToPdf(png: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(png);
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const context = canvas.getContext("2d");

    if (!context) {
        bitmap.close();
        throw new Error("Could not prepare the PDF canvas.");
    }

    context.fillStyle = "#fbfaf6";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.94);
    const jpegBytes = base64ToBytes(jpegDataUrl.split(",")[1] || "");
    const pageWidth = Math.max(1, width * 0.75);
    const pageHeight = Math.max(1, height * 0.75);
    const content = `q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const parts: BlobPart[] = [];
    const offsets: number[] = [];
    let length = 0;

    const push = (part: string | Uint8Array) => {
        parts.push(part as BlobPart);
        length +=
            typeof part === "string"
                ? encoder.encode(part).byteLength
                : part.byteLength;
    };
    const beginObject = (id: number) => {
        offsets[id] = length;
        push(`${id} 0 obj\n`);
    };
    const endObject = () => push("\nendobj\n");

    push("%PDF-1.4\n");

    beginObject(1);
    push("<< /Type /Catalog /Pages 2 0 R >>");
    endObject();

    beginObject(2);
    push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    endObject();

    beginObject(3);
    push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(
            2
        )} ${pageHeight.toFixed(
            2
        )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    );
    endObject();

    beginObject(4);
    push(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
            `/Length ${jpegBytes.length} >>\nstream\n`
    );
    push(jpegBytes);
    push("\nendstream");
    endObject();

    beginObject(5);
    push(`<< /Length ${contentBytes.length} >>\nstream\n`);
    push(contentBytes);
    push("\nendstream");
    endObject();

    const xrefOffset = length;
    push("xref\n0 6\n0000000000 65535 f \n");
    for (let objectId = 1; objectId <= 5; objectId += 1) {
        push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`);
    }
    push(
        `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    );

    return new Blob(parts, { type: "application/pdf" });
}

function Whiteboard({ projectId, session, readOnly = false }: WhiteboardProps) {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [activeTool, setActiveTool] = useState("Selection");
    const [selectedElement, setSelectedElement] = useState<ExcalidrawElement | null>(null);
    const [canvasState, setCanvasState] = useState<AppState | null>(null);
    const [showAISidebar, setShowAISidebar] = useState(false);
    const [excalidrawMenuOpen, setExcalidrawMenuOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
    const [libraryItems] = useState<LibraryItems>(loadLibrary);
    const initialLoadDone = useRef(false);
    const loadingRef = useRef(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const applyingRemoteRef = useRef(false);
    const latestRef = useRef<{
        elements: readonly ExcalidrawElement[];
        appState: AppState;
        files: BinaryFiles;
    } | null>(null);
    const dirtyRef = useRef(false);
    const dirtySinceRef = useRef<number | null>(null);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const pendingSyncRef = useRef(false);
    const lastSceneVersionRef = useRef(-1);
    const lastBackgroundRef = useRef<string | undefined>(undefined);
    const lastSelectionKeyRef = useRef("");
    const selectedIdsRef = useRef<Record<string, true>>({});
    const activeToolRef = useRef("Selection");
    const pointerRef = useRef<{ x: number; y: number; tool: "pointer" | "laser" } | null>(null);
    const collaboratorsKeyRef = useRef("");
    const flushRef = useRef<(showToast?: boolean) => Promise<void>>(async () => {});
    const readOnlyRef = useRef(readOnly);
    const railHidden = showAISidebar || excalidrawMenuOpen || readOnly;

    useEffect(() => {
        readOnlyRef.current = readOnly;
    }, [readOnly]);

    useEffect(() => {
        initialLoadDone.current = false;
        loadingRef.current = false;
        latestRef.current = null;
        dirtyRef.current = false;
        dirtySinceRef.current = null;
        lastSceneVersionRef.current = -1;
        lastBackgroundRef.current = undefined;
        collaboratorsKeyRef.current = "";
    }, [projectId]);

    const cacheKey = `scribeboard:scene:${projectId}`;

    const writeLocalCache = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
        try {
            const payload = JSON.stringify({
                elements,
                appState: pickPersistedAppState(appState as unknown as Record<string, unknown>),
                savedAt: Date.now(),
            });
            if (payload.length <= MAX_CACHED_ELEMENTS_CHARS) {
                localStorage.setItem(cacheKey, payload);
            }
        } catch {
            // Local storage can be full or blocked; the cloud session still works.
        }
    }, [cacheKey]);

    const readLocalCache = useCallback(() => {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as {
                elements?: unknown;
                appState?: Record<string, unknown>;
            };
            const elements = sanitizeElements(parsed.elements);
            if (elements.length === 0) return null;
            return { elements, appState: parsed.appState || {} };
        } catch {
            return null;
        }
    }, [cacheKey]);

    const loadWhiteboardData = useCallback(async (api: ExcalidrawImperativeAPI) => {
        if (loadingRef.current || initialLoadDone.current) return;
        loadingRef.current = true;

        const snapshot = await session.fetchSnapshot();
        let elements: ExcalidrawElement[] = snapshot?.elements || [];
        const files = snapshot?.files || {};
        let loadedAppState = snapshot?.appState || {};

        if (elements.length === 0) {
            const cached = readLocalCache();
            if (cached) {
                elements = cached.elements;
                loadedAppState = cached.appState;
            }
        }

        const restoredAppState = {
            ...loadedAppState,
            collaborators: new Map(),
            viewBackgroundColor:
                typeof loadedAppState.viewBackgroundColor === "string"
                    ? loadedAppState.viewBackgroundColor
                    : "#fbfaf6",
            viewModeEnabled: readOnly,
        };

        api.updateScene({
            elements,
            appState: restoredAppState,
        });

        if (files && Object.keys(files).length > 0) {
            api.addFiles(Object.values(files));
        }

        latestRef.current = {
            elements,
            appState: restoredAppState as unknown as AppState,
            files: files as BinaryFiles,
        };
        lastSceneVersionRef.current = sceneVersionOf(elements);
        lastBackgroundRef.current = restoredAppState.viewBackgroundColor;
        initialLoadDone.current = true;
        loadingRef.current = false;

        if (session.accessError) {
            setSaveStatus("offline");
            session.reportSyncStatus("offline");
        } else if (snapshot?.persisted === false) {
            setSaveStatus("offline");
            session.reportSyncStatus("offline");
        } else {
            setSaveStatus("saved");
            session.reportSyncStatus("saved");
        }
    }, [readLocalCache, readOnly, session]);

    useEffect(() => {
        if (excalidrawAPI && session.clientId) {
            // Hydrating from the collaboration snapshot is an external-store
            // read. The state updates happen after the awaited fetch.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void loadWhiteboardData(excalidrawAPI);
        }
    }, [excalidrawAPI, loadWhiteboardData, session.clientId]);

    useEffect(() => {
        if (!excalidrawAPI || !initialLoadDone.current) return;
        excalidrawAPI.updateScene({
            appState: { viewModeEnabled: readOnly },
        });
    }, [excalidrawAPI, readOnly]);

    // Excalidraw renders its dropdowns outside React's tree. Mirror that
    // state here so the rail is also removed from the tab order while a
    // menu is open, not only visually hidden by CSS.
    useEffect(() => {
        const root = canvasContainerRef.current;
        if (!root) return;

        const syncMenuState = () => {
            setExcalidrawMenuOpen(
                Boolean(root.querySelector('[data-testid="dropdown-menu"]'))
            );
        };

        syncMenuState();
        const observer = new MutationObserver(syncMenuState);
        observer.observe(root, {
            childList: true,
            subtree: true,
        });

        return () => observer.disconnect();
    }, []);

    const applyRemoteChanges = useCallback((changes: SceneChanges) => {
        const api = excalidrawAPI;
        if (!api) return;

        const localElements = api.getSceneElementsIncludingDeleted();
        if (Array.isArray(changes.elements) && changes.elements.length > 0) {
            const remoteElements = changes.elements as unknown;
            const merged = reconcileElements(
                localElements as never,
                remoteElements as never,
                api.getAppState()
            ) as unknown as readonly ExcalidrawElement[];

            if (hasNewerElements(localElements, merged)) {
                applyingRemoteRef.current = true;
                api.updateScene({ elements: merged as ExcalidrawElement[] });
                lastSceneVersionRef.current = sceneVersionOf(merged);

                if (latestRef.current) {
                    latestRef.current = {
                        ...latestRef.current,
                        elements: merged,
                    };
                }

                const selectedIds = Object.keys(api.getAppState().selectedElementIds || {});
                const selected = selectedIds.length === 1
                    ? merged.find((element) => element.id === selectedIds[0] && !element.isDeleted)
                    : null;
                setSelectedElement(selected || null);

                requestAnimationFrame(() => {
                    applyingRemoteRef.current = false;
                });
            }
        }

        if (changes.files && Object.keys(changes.files).length > 0 && api.addFiles) {
            api.addFiles(Object.values(changes.files));
        }
    }, [excalidrawAPI]);

    const subscribeToScene = session.subscribeToScene;
    useEffect(() => {
        return subscribeToScene(applyRemoteChanges);
    }, [applyRemoteChanges, subscribeToScene]);

    // Show every other participant's cursor, selection and laser trail inside
    // Excalidraw's native collaboration layer.
    useEffect(() => {
        const api = excalidrawAPI;
        if (!api) return;

        const collaborators = new Map<SocketId, Collaborator>();
        const keyParts: string[] = [];

        for (const participant of session.participants) {
            if (participant.clientId === session.clientId) continue;
            const palette = colorForIdentity(participant.identityId || participant.clientId);
            const selected = participant.selectedElementIds || {};
            keyParts.push(
                `${participant.clientId}:${participant.pointer?.x ?? ""}:${
                    participant.pointer?.y ?? ""
                }:${participant.button || ""}:${Object.keys(selected).length}`
            );
            collaborators.set(participant.clientId as SocketId, {
                id: participant.identityId,
                socketId: participant.clientId as SocketId,
                username: participant.name,
                avatarUrl: participant.avatarUrl,
                color: {
                    background: palette.background,
                    stroke: palette.stroke,
                },
                pointer: participant.pointer,
                button: participant.button,
                selectedElementIds: selected,
                isCurrentUser: false,
            });
        }

        const key = keyParts.sort().join("|");
        if (key === collaboratorsKeyRef.current) return;
        collaboratorsKeyRef.current = key;

        applyingRemoteRef.current = true;
        api.updateScene({ appState: { collaborators } });
        requestAnimationFrame(() => {
            applyingRemoteRef.current = false;
        });
    }, [excalidrawAPI, session.clientId, session.participants]);

    const flushScene = useCallback(async (showToast = false) => {
        if (!initialLoadDone.current || readOnlyRef.current) return;
        if (inFlightRef.current) {
            pendingSyncRef.current = true;
            return;
        }

        const latest = latestRef.current;
        if (!latest) return;

        inFlightRef.current = true;
        dirtyRef.current = false;
        dirtySinceRef.current = null;
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = null;
        }

        setSaveStatus("saving");
        session.reportSyncStatus("saving");
        writeLocalCache(latest.elements, latest.appState);

        const response = await session.pushScene({
            elements: latest.elements as ExcalidrawElement[],
            files: latest.files,
            appState: pickPersistedAppState(
                latest.appState as unknown as Record<string, unknown>
            ),
        });

        inFlightRef.current = false;

        if (response) {
            setSaveStatus("saved");
            session.reportSyncStatus("saved");

            if (
                Array.isArray(response.elements) &&
                response.elements.length > 0 &&
                excalidrawAPI &&
                hasNewerElements(
                    excalidrawAPI.getSceneElementsIncludingDeleted(),
                    response.elements
                )
            ) {
                applyRemoteChanges({
                    elements: response.elements,
                    files: response.files,
                    revision: response.revision,
                });
            }

            writeLocalCache(
                response.elements,
                response.appState as unknown as AppState
            );

            if (showToast) {
                toast.add({
                    type: "success",
                    title: "Canvas synced",
                    description: "Everyone on this board can see your changes.",
                });
            }
        } else {
            setSaveStatus("offline");
            session.reportSyncStatus("offline");
            writeLocalCache(latest.elements, latest.appState);
            if (showToast) {
                toast.add({
                    type: "error",
                    title: "Sync paused",
                    description:
                        "Your changes are saved on this device and will sync when the connection returns.",
                });
            }
        }

        if (pendingSyncRef.current || dirtyRef.current) {
            pendingSyncRef.current = false;
            setTimeout(() => {
                void flushRef.current();
            }, 0);
        }
    }, [applyRemoteChanges, excalidrawAPI, session, writeLocalCache]);

    useEffect(() => {
        flushRef.current = flushScene;
    }, [flushScene]);

    const scheduleSync = useCallback(() => {
        dirtyRef.current = true;
        const now = Date.now();
        if (!dirtySinceRef.current) dirtySinceRef.current = now;

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        const elapsed = now - dirtySinceRef.current;
        const delay = elapsed >= 2400 ? 0 : Math.min(700, 2400 - elapsed);

        syncTimerRef.current = setTimeout(() => {
            syncTimerRef.current = null;
            void flushRef.current();
        }, delay);
    }, []);

    const sendSelectionPresence = useCallback((appState: AppState) => {
        if (readOnlyRef.current || !initialLoadDone.current) return;
        const ids = Object.keys(appState.selectedElementIds || {}).filter(
            (id) => appState.selectedElementIds[id]
        );
        const selectedIds: Record<string, true> = {};
        for (const id of ids.slice(0, 200)) selectedIds[id] = true;
        selectedIdsRef.current = selectedIds;

        const selectionKey = ids.slice(0, 200).sort().join(",");
        if (selectionKey !== lastSelectionKeyRef.current) {
            lastSelectionKeyRef.current = selectionKey;
            session.sendPresence({
                selectedElementIds: selectedIds,
                activeTool: activeToolRef.current,
                pointer: pointerRef.current || undefined,
                button: "up",
                force: true,
            });
        }
    }, [session]);

    const handleCanvasChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        setCanvasState(appState);
        const selectedIds = Object.keys(appState.selectedElementIds || {});
        if (selectedIds?.length === 1) {
            const element = elements.find((element) => element.id === selectedIds[0]);
            if (element) {
                setSelectedElement(element);
            }
        } else {
            setSelectedElement(null);
        }

        const currentTool = appState.activeTool?.type;
        if (currentTool) {
            activeToolRef.current = currentTool;
            const mappedName = TOOL_NAME_MAP[currentTool];
            if (mappedName) {
                setActiveTool(mappedName);
            }
        } else {
            activeToolRef.current = "selection";
        }
        sendSelectionPresence(appState);

        if (!initialLoadDone.current) return;

        const sceneVersion = sceneVersionOf(elements);
        const background = appState.viewBackgroundColor;
        const changed =
            sceneVersion !== lastSceneVersionRef.current ||
            background !== lastBackgroundRef.current;

        lastSceneVersionRef.current = sceneVersion;
        lastBackgroundRef.current = background;

        if (applyingRemoteRef.current) return;
        if (readOnlyRef.current) {
            latestRef.current = { elements, appState, files };
            return;
        }
        if (!changed) return;

        latestRef.current = { elements, appState, files };
        setSaveStatus("unsaved");
        session.reportSyncStatus("idle");
        scheduleSync();
    }

    useEffect(() => {
        const handleManualSave = () => {
            void flushRef.current(true);
        };

        window.addEventListener("whiteboard:save-request", handleManualSave);
        return () => {
            window.removeEventListener("whiteboard:save-request", handleManualSave);
        };
    }, []);

    useEffect(() => {
        const handleExport = async (event: Event) => {
            const detail = (event as CustomEvent<{
                format?: string;
                filename?: string;
            }>).detail;
            const format = detail?.format;
            if (format !== "png" && format !== "pdf" && format !== "svg") {
                return;
            }

            const complete = (ok: boolean) => {
                window.dispatchEvent(
                    new CustomEvent("whiteboard:export-complete", {
                        detail: { format, ok },
                    })
                );
            };

            const api = excalidrawAPI;
            if (!api) {
                toast.add({
                    type: "error",
                    title: "Export unavailable",
                    description: "Wait for the canvas to finish loading, then try again.",
                });
                complete(false);
                return;
            }

            const elements = api.getSceneElements();
            if (elements.length === 0) {
                toast.add({
                    type: "error",
                    title: "Nothing to export",
                    description: "Add a shape, note or diagram to the canvas first.",
                });
                complete(false);
                return;
            }

            const appState = api.getAppState();
            const files = api.getFiles();
            const baseName = safeFilename(
                detail?.filename || session.projectName || projectId
            );
            const exportAppState = {
                ...appState,
                exportBackground: true,
                exportWithDarkMode: false,
                viewBackgroundColor:
                    appState.viewBackgroundColor || "#fbfaf6",
            };

            try {
                if (format === "svg") {
                    const svg = await exportToSvg({
                        elements,
                        appState: exportAppState,
                        files,
                        exportPadding: 32,
                    });
                    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                    const markup =
                        '<?xml version="1.0" encoding="UTF-8"?>\n' +
                        new XMLSerializer().serializeToString(svg);
                    downloadBlob(
                        new Blob([markup], {
                            type: "image/svg+xml;charset=utf-8",
                        }),
                        `${baseName}.svg`
                    );
                } else {
                    const png = await exportToBlob({
                        elements,
                        appState: exportAppState,
                        files,
                        mimeType: "image/png",
                        quality: 1,
                        exportPadding: 32,
                    });

                    if (format === "png") {
                        downloadBlob(png, `${baseName}.png`);
                    } else {
                        const pdf = await pngToPdf(png);
                        downloadBlob(pdf, `${baseName}.pdf`);
                    }
                }

                toast.add({
                    type: "success",
                    title: `${format.toUpperCase()} exported`,
                    description:
                        "The canvas was downloaded on its warm paper background.",
                });
                complete(true);
            } catch (error) {
                console.error("Canvas export failed:", error);
                toast.add({
                    type: "error",
                    title: "Export failed",
                    description:
                        error instanceof Error
                            ? error.message
                            : "The canvas could not be rendered for export.",
                });
                complete(false);
            }
        };

        window.addEventListener("whiteboard:export-request", handleExport);
        return () => {
            window.removeEventListener("whiteboard:export-request", handleExport);
        };
    }, [excalidrawAPI, projectId, session.projectName]);

    // Persist the last few edits when the tab is closed or backgrounded. A
    // beacon is not guaranteed to be persisted, but it bridges the gap before
    // the next collaborator opens the board.
    useEffect(() => {
        const sendBeacon = () => {
            const latest = latestRef.current;
            if (!latest || readOnlyRef.current || !dirtyRef.current) return;
            const payload = JSON.stringify({
                projectId,
                shareToken: session.shareToken,
                clientId: session.clientId,
                guestName: session.identity?.name || "Guest",
                elements: latest.elements,
                files: latest.files,
                appState: pickPersistedAppState(
                    latest.appState as unknown as Record<string, unknown>
                ),
            });

            try {
                navigator.sendBeacon(
                    "/api/collab/state",
                    new Blob([payload], { type: "application/json" })
                );
            } catch {
                // Best-effort only.
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
                void flushRef.current();
                sendBeacon();
            }
        };

        window.addEventListener("pagehide", sendBeacon);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.removeEventListener("pagehide", sendBeacon);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [projectId, session.clientId, session.identity?.name, session.shareToken]);

    const changeTool = (tool: string) => {
        if (!excalidrawAPI || readOnly) return;
        setActiveTool(tool);
        const excalType = tool === "Draw" ? "freedraw" : tool.toLowerCase();
        const shouldLock = excalType !== "selection" && excalType !== "hand";
        excalidrawAPI.setActiveTool({
            type: excalType as ToolType,
            locked: shouldLock,
        });
        session.sendPresence({
            activeTool: excalType,
            pointer: pointerRef.current || undefined,
            selectedElementIds: selectedIdsRef.current,
            button: "up",
            force: true,
        });
    }

    const handlePointerUpdate = useCallback((payload: {
        pointer: { x: number; y: number; tool: "pointer" | "laser" };
        button: "down" | "up";
    }) => {
        pointerRef.current = payload.pointer;
        if (!initialLoadDone.current) return;
        session.sendPresence({
            pointer: payload.pointer,
            button: payload.button,
            selectedElementIds: selectedIdsRef.current,
            activeTool: activeToolRef.current,
        });
    }, [session]);

    const getFloatingPosition = () => {
        if (!selectedElement || !canvasState)
            return { left: 0, top: 0 };

        const zoom = canvasState.zoom?.value ?? 1;
        const scrollX = canvasState.scrollX ?? 0;
        const scrollY = canvasState.scrollY ?? 0;
        const centerX = selectedElement.x + (selectedElement.width || 0) / 2;
        const screenX = (centerX + scrollX) * zoom;
        const screenY = (selectedElement.y + scrollY) * zoom;

        return {
            left: screenX,
            top: screenY - 60
        };
    }

    const floatingPosition = getFloatingPosition();

    const handlePropertyChange = (property: string, value: unknown) => {
        if (!excalidrawAPI || !selectedElement || readOnly) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((element) => {
            if (element.id !== selectedElement.id) {
                return element;
            }

            return {
                ...element,
                [property]: value,
                version: element.version + 1,
                updated: Date.now(),
            } as unknown as ExcalidrawElement;
        });

        excalidrawAPI.updateScene({
            elements: updatedElements,
        });

        const currentUpdated = updatedElements.find((el) => el.id === selectedElement.id);
        if (currentUpdated) {
            setSelectedElement(currentUpdated);
        }
    };

    const handleDeleteElement = () => {
        if (!excalidrawAPI || !selectedElement || readOnly) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((element) => {
            if (element.id === selectedElement.id) {
                return {
                    ...element,
                    isDeleted: true,
                    version: element.version + 1,
                    updated: Date.now(),
                };
            }
            return element;
        });

        excalidrawAPI.updateScene({
            elements: updatedElements,
        });

        setSelectedElement(null);
    };

    const handleOnDuplicate = () => {
        if (!excalidrawAPI || !selectedElement || readOnly) return;

        const elements = excalidrawAPI.getSceneElements();
        const duplicateElement = {
            ...selectedElement,
            id: crypto.randomUUID(),
            x: selectedElement.x + 24,
            y: selectedElement.y + 24,
            seed: Math.floor(Math.random() * 1000000),
            version: 1,
            updated: Date.now(),
            isDeleted: false,
        };

        excalidrawAPI.updateScene({
            elements: [...elements, duplicateElement],
        });
    };

    const handleLockElement = () => {
        if (!excalidrawAPI || !selectedElement || readOnly) return;

        const elements = excalidrawAPI.getSceneElements();
        const updatedElements = elements.map((element) => {
            if (element.id !== selectedElement.id) {
                return element;
            }

            return {
                ...element,
                locked: !element.locked,
                version: element.version + 1,
                updated: Date.now(),
            };
        });

        excalidrawAPI.updateScene({
            elements: updatedElements,
        });

        const updatedSelectedElement = updatedElements.find(
            (element) => element.id === selectedElement.id
        );

        if (updatedSelectedElement) {
            setSelectedElement(updatedSelectedElement);
        }
    };

    const handleBringFrontBack = (type: "front" | "back") => {
        if (!excalidrawAPI || !selectedElement || readOnly) return;

        const elements = excalidrawAPI.getSceneElements();
        const selected = elements.find((element) => element.id === selectedElement.id);
        if (!selected) return;

        const remainingElements = elements.filter(
            (element) => element.id !== selectedElement.id
        );

        const updatedSelected = {
            ...selected,
            version: selected.version + 1,
            updated: Date.now(),
        };

        if (type === "front") {
            excalidrawAPI.updateScene({
                elements: [...remainingElements, updatedSelected],
            });
        } else {
            excalidrawAPI.updateScene({
                elements: [updatedSelected, ...remainingElements],
            });
        }
    };

    return (
        <div ref={canvasContainerRef} className="relative h-full w-full" data-project-id={projectId}>
            <div className="h-full w-full">
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    onChange={handleCanvasChange}
                    onPointerUpdate={handlePointerUpdate}
                    isCollaborating
                    onLibraryChange={(items) => {
                        try {
                            localStorage.setItem(
                                LIBRARY_STORAGE_KEY,
                                JSON.stringify(items)
                            );
                        } catch {
                            // Library persistence is nice-to-have; never block drawing.
                        }
                    }}
                    initialData={{
                        appState: {
                            collaborators: new Map(),
                            viewBackgroundColor: "#fbfaf6",
                            viewModeEnabled: readOnly,
                        },
                        libraryItems,
                    }}
                />
            </div>

            {readOnly && (
                <div className="glass-chip pointer-events-none absolute top-4 left-1/2 z-40 h-8 -translate-x-1/2 gap-1.5 border-[#151714]/8 px-3.5 text-[10.5px] font-semibold text-[#6c726d]">
                    <Lock className="h-3 w-3" />
                    <span>View only</span>
                </div>
            )}

            {session.accessError && (
                <div className="glass-panel absolute left-1/2 top-4 z-50 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 border-[#9a4335]/22 bg-[rgba(255,248,245,0.94)] p-3.5 text-[11.5px] leading-relaxed text-[#7d3427]">
                    <p className="font-semibold">Live sync is unavailable</p>
                    <p className="mt-1 text-[#7d3427]/80">{session.accessError}</p>
                </div>
            )}

            <div
                data-glass-reactive
                onPointerDown={(e) => e.stopPropagation()}
                className={`workspace-rail glass-rail-dark absolute top-1/2 left-4 z-50 flex -translate-y-1/2 flex-col gap-1 p-2 ${
                    railHidden
                        ? "pointer-events-none -translate-x-3 scale-95 opacity-0"
                        : "translate-x-0 scale-100 opacity-100"
                }`}
                aria-hidden={railHidden || undefined}
                inert={railHidden || undefined}
            >
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.name;
                    return (
                        <button
                            key={tool.name}
                            type="button"
                            aria-label={tool.name}
                            aria-pressed={isActive}
                            title={tool.name}
                            className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[12px] transition-[background-color,box-shadow,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.96] sm:h-10 sm:w-10 ${
                                isActive
                                    ? "bg-[#faf9f6] text-[#151714] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_-9px_rgba(0,0,0,0.75)]"
                                    : "text-white/55 hover:bg-white/10 hover:text-white"
                            }`}
                            onClick={() => changeTool(tool.name)}
                        >
                            <Icon size={18} />
                            {isActive && (
                                <span className="absolute right-1.5 top-1.5 size-1 rounded-full bg-[#2aab70]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {!readOnly && (
                <FloatingProperties
                    selectedElement={selectedElement}
                    position={floatingPosition}
                    onPropertyChange={handlePropertyChange}
                    onDelete={() => handleDeleteElement()}
                    onDuplicate={() => handleOnDuplicate()}
                    onBringToFront={() => handleBringFrontBack("front")}
                    onSendToBack={() => handleBringFrontBack("back")}
                    onLock={handleLockElement}
                />
            )}

            <div className="glass-chip pointer-events-none absolute bottom-5 left-1/2 z-40 h-8 -translate-x-1/2 gap-1.5 border-[#151714]/8 px-3.5 text-[10.5px] font-semibold">
                {saveStatus === "saving" ? (
                    <>
                        <Loader2 className="h-3 w-3 animate-spin text-[#065f46]" />
                        <span>Syncing</span>
                    </>
                ) : saveStatus === "saved" ? (
                    <>
                        <span className="size-1.5 rounded-full bg-[#2aab70] shadow-[0_0_0_3px_rgba(42,171,112,0.1)]" />
                        <span>
                            {session.storageMode === "session"
                                ? "Saved to session"
                                : "Saved to cloud"}
                        </span>
                    </>
                ) : saveStatus === "offline" ? (
                    <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#b07b22] animate-pulse" />
                        <span>Saved on this device</span>
                    </>
                ) : (
                    <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#b07b22] animate-pulse" />
                        <span>Unsaved</span>
                    </>
                )}
            </div>

            {!readOnly && (
                <div
                    className={`absolute bottom-5 right-5 z-50 transition-all duration-300 ease-[var(--ease-out)] motion-reduce:transition-none ${
                        showAISidebar
                            ? "pointer-events-none translate-y-2 scale-95 opacity-0"
                            : "translate-y-0 scale-100 opacity-100"
                    }`}
                    aria-hidden={showAISidebar || undefined}
                >
                    <Button
                        size="lg"
                        onClick={() => setShowAISidebar(!showAISidebar)}
                        tabIndex={showAISidebar ? -1 : 0}
                        className="h-12 gap-2.5 rounded-full border-white/12 px-5.5 text-[12.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_38px_-18px_rgba(21,23,20,0.9)]"
                    >
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#5ee0a4]/10">
                            <Sparkles className="h-3.5 w-3.5 text-[#a7e8c8]" />
                        </span>
                        <span className="hidden sm:inline">AI assistant</span>
                        <span className="sm:hidden">AI</span>
                    </Button>
                </div>
            )}

            {showAISidebar && !readOnly && (
                <AIFloatingSidebar
                    excalidrawApi={excalidrawAPI}
                    onClose={() => setShowAISidebar(false)}
                    projectId={projectId}
                    shareToken={session.shareToken}
                />
            )}
        </div>
    );
}

export default Whiteboard;
