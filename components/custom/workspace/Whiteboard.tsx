"use client"
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useState, useRef, useEffect, useCallback } from 'react';
import "./whiteboard.css"
const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false }
);

import axios from 'axios';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import type {
    AppState,
    BinaryFiles,
    ExcalidrawImperativeAPI,
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
    Loader2
} from "@/lib/icons";
import FloatingProperties from "./FloatingProperties";
import { Button } from "@/components/ui/button"
import AIFloatingSidebar from "./AIFloatingSidebar";

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

function Whiteboard() {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { projectid } = useParams();
    const [activeTool, setActiveTool] = useState("Selection");
    const [selectedElement, setSelectedElement] = useState<ExcalidrawElement | null>(null);
    const [canvasState, setCanvasState] = useState<AppState | null>(null);
    const [showAISidebar, setShowAISidebar] = useState(false);
    const [excalidrawMenuOpen, setExcalidrawMenuOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
    const initialLoadDone = useRef(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const railHidden = showAISidebar || excalidrawMenuOpen;

    const loadWhiteboardData = useCallback(async (api: ExcalidrawImperativeAPI) => {
        if (!projectid || initialLoadDone.current) return;
        try {
            const res = await axios.get(`/api/whiteboard?projectId=${projectid}`);
            if (res.data?.elements && Array.isArray(res.data.elements) && res.data.elements.length > 0) {
                const loadedAppState = res.data.appState ? { ...res.data.appState } : {};
                delete loadedAppState.collaborators;
                api.updateScene({
                    elements: res.data.elements,
                    appState: {
                        ...loadedAppState,
                        collaborators: new Map(),
                        viewBackgroundColor: "#fbfaf6",
                    },
                });
                if (res.data.files && Object.keys(res.data.files).length > 0) {
                    api.addFiles(Object.values(res.data.files));
                }
            }
            initialLoadDone.current = true;
        } catch (err) {
            console.error("Failed to load whiteboard data:", err);
        }
    }, [projectid]);

    useEffect(() => {
        if (excalidrawAPI) {
            loadWhiteboardData(excalidrawAPI);
        }
    }, [excalidrawAPI, loadWhiteboardData]);

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

    const savecanvasChanges = useCallback(async (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles, showToast = false) => {
        if (!projectid) return;
        setSaveStatus("saving");
        const serializableAppState: Partial<AppState> = { ...appState };
        delete serializableAppState.collaborators;
        try {
            await axios.post("/api/whiteboard", {
                projectId: projectid,
                elements: elements,
                appState: serializableAppState,
                files: files
            });
            setSaveStatus("saved");
            if (showToast) {
                toast.add({ type: "success", title: "Whiteboard Saved" });
            }
        } catch (err) {
            console.error(err);
            setSaveStatus("unsaved");
            if (showToast) {
                toast.add({ type: "error", title: "Save failed" });
            }
        }
    }, [projectid])

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

        if (initialLoadDone.current) {
            setSaveStatus("unsaved");
            if (saveTimerRef?.current) {
                clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
                savecanvasChanges(elements, appState, files, false);
            }, 3000);
        }
    }

    useEffect(() => {
        const handleManualSave = () => {
            if (excalidrawAPI) {
                const elements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();
                const files = excalidrawAPI.getFiles();
                savecanvasChanges(elements, appState, files, true);
            }
        };

        window.addEventListener("whiteboard:save-request", handleManualSave);
        return () => {
            window.removeEventListener("whiteboard:save-request", handleManualSave);
        };
    }, [excalidrawAPI, savecanvasChanges]);

    const changeTool = (tool: string) => {
        if (!excalidrawAPI) return;
        setActiveTool(tool);
        const excalType = tool === "Draw" ? "freedraw" : tool.toLowerCase();
        excalidrawAPI.setActiveTool({
            type: excalType as ToolType
        });
    }

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
        if (!excalidrawAPI || !selectedElement) return;

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
        if (!excalidrawAPI || !selectedElement) return;

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
        if (!excalidrawAPI || !selectedElement) return;

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
        if (!excalidrawAPI || !selectedElement) return;

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
        if (!excalidrawAPI || !selectedElement) return;

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
        <div ref={canvasContainerRef} className="relative h-full w-full">
            <div className="h-full w-full">
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    onChange={handleCanvasChange}
                    initialData={{
                        appState: {
                            collaborators: new Map(),
                            viewBackgroundColor: "#fbfaf6",
                        },
                    }}
                />
            </div>

            <div
                data-glass-reactive
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

            <div className="glass-chip pointer-events-none absolute bottom-5 left-1/2 z-40 h-8 -translate-x-1/2 gap-1.5 border-[#151714]/8 px-3.5 text-[10.5px] font-semibold">
                {saveStatus === "saving" ? (
                    <>
                        <Loader2 className="h-3 w-3 animate-spin text-[#065f46]" />
                        <span>Saving</span>
                    </>
                ) : saveStatus === "saved" ? (
                    <>
                        <span className="size-1.5 rounded-full bg-[#2aab70] shadow-[0_0_0_3px_rgba(42,171,112,0.1)]" />
                        <span>Saved</span>
                    </>
                ) : (
                    <>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#b07b22] animate-pulse" />
                        <span>Unsaved</span>
                    </>
                )}
            </div>

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

            {showAISidebar && (
                <AIFloatingSidebar
                    excalidrawApi={excalidrawAPI}
                    onClose={() => setShowAISidebar(false)}
                />
            )}
        </div>
    );
}

export default Whiteboard;
