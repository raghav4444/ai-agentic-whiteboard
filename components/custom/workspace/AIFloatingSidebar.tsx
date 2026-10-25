"use client"

import React, { useState, useRef } from "react"
import {
  Sparkles,
  X,
  Workflow,
  Network,
  Monitor,
  Smartphone,
  ArrowUp,
  Wand2,
  Loader2,
  HelpCircle,
  Lightbulb,
  FileText,
  Copy,
  Check,
  Layers,
  RotateCcw,
  Trash2,
} from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import axios from "axios"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform"

interface AIFloatingSidebarProps {
  onClose?: () => void
  onGenerate?: (tool: string, prompt: string) => void
  excalidrawApi?: ExcalidrawImperativeAPI | null
  projectId?: string
  shareToken?: string
}

interface GeneratedElement {
  type?: string
  x?: number
  y?: number
  points?: [number, number][]
  [key: string]: unknown
}

function getElementText(element: unknown): string {
  if (!element || typeof element !== "object") return ""
  const text = (element as { text?: unknown }).text
  return typeof text === "string" ? text : ""
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback
  const response = (
    error as {
      response?: { data?: { detail?: unknown; error?: unknown } }
    }
  ).response
  const detail = response?.data?.detail
  const message = response?.data?.error
  if (typeof detail === "string" && detail.trim()) return detail
  if (typeof message === "string" && message.trim()) return message
  return fallback
}

const AiTools = [
  {
    name: "Auto",
    desc: "Infer the right visual",
    icon: Sparkles,
    color: "text-white/80",
    bgColor: "bg-white/8",
    activeRing: "border-white/25 bg-white/12 ring-1 ring-white/15",
    presets: [
      "SaaS architecture with auth, billing & AI",
      "Customer onboarding journey",
      "Marketplace database schema",
    ],
  },
  {
    name: "Flowchart",
    desc: "Visualize workflows",
    icon: Workflow,
    color: "text-white/80",
    bgColor: "bg-white/8",
    activeRing: "border-white/25 bg-white/12 ring-1 ring-white/15",
    presets: ["OAuth2 / JWT Token Refresh", "Multi-Step Checkout & Payment", "Support Ticket Incident Escalation"],
  },
  {
    name: "Architecture",
    desc: "Design system architecture",
    icon: Network,
    color: "text-white/80",
    bgColor: "bg-white/8",
    activeRing: "border-white/25 bg-white/12 ring-1 ring-white/15",
    presets: ["Next.js + Neon + Clerk + Redis Stack", "Kubernetes Microservices Mesh", "Kafka Event-Driven Architecture"],
  },
  {
    name: "Web Mockup",
    desc: "Generate web wireframes",
    icon: Monitor,
    color: "text-white/80",
    bgColor: "bg-white/8",
    activeRing: "border-white/25 bg-white/12 ring-1 ring-white/15",
    presets: ["SaaS Analytics Dashboard", "Architecture Workspace", "E-Commerce Storefront"],
  },
  {
    name: "Mobile Mockup",
    desc: "Generate app wireframes",
    icon: Smartphone,
    color: "text-white/80",
    bgColor: "bg-white/8",
    activeRing: "border-white/25 bg-white/12 ring-1 ring-white/15",
    presets: ["Mobile Auth & 2FA Screen", "Crypto Wallet Portfolio", "Real-Time Activity Feed"],
  },
]

export default function AIFloatingSidebar({
  onClose,
  onGenerate,
  excalidrawApi,
  projectId,
  shareToken,
}: AIFloatingSidebarProps) {
  const [selectedTool, setSelectedTool] = useState("Auto")
  const [selectedType, setSelectedType] = useState(AiTools[0])
  const [userInput, setUserInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiTextResult, setAiTextResult] = useState<string | null>(null)
  const [resultMeta, setResultMeta] = useState<{
    title?: string
    diagramType?: string
    model?: string
  } | null>(null)
  const [detailLevel, setDetailLevel] = useState<"standard" | "enterprise">("enterprise")
  const [canvasMode, setCanvasMode] = useState<"replace" | "append">("replace")
  const [copiedText, setCopiedText] = useState(false)
  const placeholderIdsRef = useRef<string[]>([])

  const getTargetCanvasPosition = (): { x: number; y: number } => {
    if (!excalidrawApi || canvasMode === "replace") {
      return { x: 80, y: 100 }
    }

    const elements = excalidrawApi
      .getSceneElements()
      .filter((element) => !element.isDeleted && !element.id.startsWith("ai-generation-placeholder"))

    if (elements.length === 0) {
      return { x: 80, y: 100 }
    }

    const maxRight = Math.max(
      ...elements.map((element) => element.x + (element.width || 0))
    )
    const minTop = Math.min(...elements.map((element) => element.y))

    return {
      x: maxRight + 120,
      y: Math.max(50, minTop),
    }
  }

  const addAiPlaceholder = async (position: { x: number; y: number }) => {
    if (!excalidrawApi) return

    try {
      const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw")
      const placeholderElements = convertToExcalidrawElements([
        {
          type: "rectangle",
          id: "ai-generation-placeholder-card",
          x: position.x,
          y: position.y,
          width: 380,
          height: 180,
          backgroundColor: "#f2f8f3",
          strokeColor: "#2aab70",
          fillStyle: "solid",
          strokeWidth: 1.5,
          roughness: 0,
          roundness: { type: 3 },
        },
        {
          type: "text",
          id: "ai-generation-placeholder-t1",
          x: position.x + 24,
          y: position.y + 30,
          text: "Thinking through the structure...",
          fontSize: 16,
          strokeColor: "#065f46",
        },
        {
          type: "text",
          id: "ai-generation-placeholder-t2",
          x: position.x + 24,
          y: position.y + 64,
          text: "Synthesizing nodes, relationships & layout",
          fontSize: 12,
          strokeColor: "#6c726d",
        },
      ])

      placeholderIdsRef.current = placeholderElements.map((el) => el.id)
      const current = excalidrawApi.getSceneElements().filter((el) => !el.id.startsWith("ai-generation-placeholder"))
      excalidrawApi.updateScene({
        elements: [...current, ...placeholderElements],
      })
    } catch (e) {
      console.error(e)
    }
  }

  const removeAiPlaceholder = () => {
    if (!excalidrawApi) return
    try {
      const elements = excalidrawApi
        .getSceneElements()
        .filter((el) => {
          if (el.id.startsWith("ai-generation-placeholder")) return false
          if (placeholderIdsRef.current.includes(el.id)) return false
          return true
        })
      excalidrawApi.updateScene({ elements })
      placeholderIdsRef.current = []
    } catch (e) {
      console.error(e)
    }
  }

  const handleClearCanvas = () => {
    if (!excalidrawApi) return
    excalidrawApi.updateScene({ elements: [] })
    toast.add({
      type: "info",
      title: "Canvas Reset",
      description: "Whiteboard cleared.",
    })
  }

  const onClickGenerate = async () => {
    if (!userInput.trim() || loading) return
    if (!excalidrawApi) {
      toast.add({
        type: "warning",
        title: "Canvas is still loading",
        description: "Wait for the whiteboard to finish opening, then try again.",
      })
      return
    }

    const currentAiTool = AiTools.find((tool) => tool.name === selectedTool) || AiTools[0]
    const requestedCanvasMode = canvasMode
    setLoading(true)
    setAiTextResult(null)
    setResultMeta(null)

    const boardContext = excalidrawApi
      .getSceneElements()
      .filter((el) => !el.isDeleted && !el.id.startsWith("ai-generation-placeholder"))
      .slice(0, 60)
      .map((el) => ({
        type: el.type,
        text: getElementText(el),
      }))
      .filter((item) => item.text.trim().length > 0)

    const targetPos = getTargetCanvasPosition()
    await addAiPlaceholder(targetPos)

    try {
      const result = await axios.post("/api/ai", {
        userInput: userInput.trim(),
        type: currentAiTool.name,
        detailLevel,
        canvasMode: requestedCanvasMode,
        ...(projectId ? { projectId } : {}),
        ...(shareToken ? { shareToken } : {}),
        ...(boardContext.length > 0 ? { context: boardContext } : {}),
      })

      removeAiPlaceholder()

      if (result.data?.elements && Array.isArray(result.data.elements) && result.data.elements.length > 0) {
        const rawElements = result.data.elements as GeneratedElement[]

        const xValues = rawElements
          .map((el) => Number(el.x))
          .filter((value) => Number.isFinite(value))
        const yValues = rawElements
          .map((el) => Number(el.y))
          .filter((value) => Number.isFinite(value))
        const minElemX = xValues.length > 0 ? Math.min(...xValues) : 0
        const minElemY = yValues.length > 0 ? Math.min(...yValues) : 0

        const normalizedElements = rawElements.map((el) => {
          let currentX = Number(el.x) || 0
          let currentY = Number(el.y) || 0
          let points = el.points

          // Older payloads sometimes encode the first point in the points array
          // instead of at x/y. Normalize that before translating the diagram.
          if (el.type === "arrow" && Array.isArray(points) && points.length > 1) {
            const p0x = Number(points[0][0]) || 0
            const p0y = Number(points[0][1]) || 0
            if (p0x !== 0 || p0y !== 0) {
              currentX += p0x
              currentY += p0y
              points = points.map(
                (point) => [point[0] - p0x, point[1] - p0y] as [number, number]
              )
            }
          }

          return {
            ...el,
            x: targetPos.x + (currentX - minElemX),
            y: targetPos.y + (currentY - minElemY),
            ...(points ? { points } : {}),
          } as unknown as ExcalidrawElementSkeleton
        })

        const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw")
        const converted = convertToExcalidrawElements(normalizedElements)

        if (converted.length === 0) {
          throw new Error("The generated diagram had no usable elements.")
        }

        const cleanExisting = excalidrawApi.getSceneElements().filter((e) => {
          if (e.isDeleted) return false
          if (e.id.startsWith("ai-generation-placeholder")) return false
          if (placeholderIdsRef.current.includes(e.id)) return false
          return true
        })

        const finalSceneElements =
          requestedCanvasMode === "replace" ? converted : [...cleanExisting, ...converted]

        excalidrawApi.updateScene({
          elements: finalSceneElements,
        })

        setTimeout(() => {
          try {
            excalidrawApi.scrollToContent(converted, {
              fitToViewport: true,
              viewportZoomFactor: 0.82,
            })
          } catch (e) {
            console.error(e)
          }
        }, 60)

        const summary =
          typeof result.data.summary === "string" && result.data.summary.trim()
            ? result.data.summary
            : null
        if (summary) setAiTextResult(summary)
        setResultMeta({
          title: result.data.title,
          diagramType: result.data.diagramType,
          model: result.data.model,
        })

        toast.add({
          type: "success",
          title: `${result.data.diagramType || "Diagram"} created`,
          description: `${converted.length} elements · ${result.data.title || "Placed on the canvas"}`,
        })

        if (Array.isArray(result.data.warnings) && result.data.warnings.length > 0) {
          toast.add({
            type: "info",
            title: "Layout note",
            description: result.data.warnings[0],
          })
        }

        if (onGenerate) {
          try {
            onGenerate(selectedTool, userInput)
          } catch (callbackError) {
            console.error(callbackError)
          }
        }
      } else {
        toast.add({
          type: "error",
          title: "Generation Failed",
          description:
            result.data?.detail ||
            result.data?.error ||
            "The assistant returned no canvas elements.",
        })
      }
    } catch (error) {
      removeAiPlaceholder()
      console.error(error)
      toast.add({
        type: "error",
        title: "AI Generation Error",
        description: getApiErrorMessage(error, "Could not generate the diagram."),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (actionType: "explain" | "brainstorm") => {
    if (!excalidrawApi || loading) return

    const currentElements = excalidrawApi.getSceneElements().filter((el) => !el.isDeleted)
    if (currentElements.length === 0 && actionType === "explain") {
      toast.add({
        type: "warning",
        title: "Whiteboard is Empty",
        description: "Add some elements or diagrams to explain first.",
      })
      return
    }

    setLoading(true)
    setAiTextResult(null)
    setResultMeta(null)

    try {
      const summaryContext = currentElements.slice(0, 80).map((el) => ({
        type: el.type,
        text: getElementText(el),
        x: Math.round(el.x),
        y: Math.round(el.y),
      }))

      const result = await axios.post("/api/ai", {
        userInput: userInput.trim() || (actionType === "explain" ? "Explain current board" : "Brainstorm whiteboard ideas"),
        action: actionType,
        context: summaryContext,
        ...(projectId ? { projectId } : {}),
        ...(shareToken ? { shareToken } : {}),
      })

      if (result.data?.response) {
        setAiTextResult(result.data.response)
        toast.add({
          type: "success",
          title: actionType === "explain" ? "Explanation Ready" : "Ideas Generated",
        })
      } else {
        toast.add({
          type: "error",
          title: "Action Failed",
          description: result.data?.detail || result.data?.error || "The AI returned no text.",
        })
      }
    } catch (error) {
      console.error(error)
      toast.add({
        type: "error",
        title: "Action Failed",
        description: getApiErrorMessage(error, "Unable to complete the AI request."),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopySummary = async () => {
    if (!aiTextResult) return
    try {
      await navigator.clipboard.writeText(aiTextResult)
      setCopiedText(true)
      toast.add({
        type: "success",
        title: "AI notes copied",
        description: "Copied the diagram explanation to the clipboard.",
      })
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      toast.add({
        type: "error",
        title: "Copy failed",
        description: "The browser blocked clipboard access.",
      })
    }
  }

  const handleSendToSmartDoc = () => {
    if (!aiTextResult) return
    window.dispatchEvent(
      new CustomEvent("smartdoc:insert-content", {
        detail: { content: aiTextResult },
      })
    )
    toast.add({
      type: "success",
      title: "Appended to SmartDoc",
      description: "Detailed output transferred to technical documentation.",
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onClickGenerate()
    }
  }

  const currentToolData = selectedType || AiTools[0]

  return (
    <div
      data-glass-reactive
      className="
        glass-dark fixed bottom-20 right-4 z-50
        flex max-h-[min(78svh,760px)] w-[calc(100%-2rem)] max-w-[400px] flex-col
        overflow-hidden overscroll-contain !rounded-[1.8rem] text-[#f7f4eb]
        animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-200
        sm:bottom-24
      "
    >
      <div className="relative shrink-0 border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold leading-none tracking-[-0.015em] text-[#f7f4eb]">
                  Visual generator
                </h2>
                <span className="glass-chip-dark mono-label inline-flex h-4 items-center gap-1 rounded-full px-1.5 text-[8.5px] text-white/70">
                  <span className="size-1 rounded-full bg-emerald-400" />
                  Ready
                </span>
              </div>
              <p className="mono-label mt-1.5 text-white/42">
                Canvas-native diagrams
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close generator"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white/45 transition-[background-color,color,transform] hover:bg-white/10 hover:text-white active:scale-[0.92] active:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="onDark"
            className="h-9 flex-1 gap-1.5 px-2 text-[11px]"
            onClick={() => handleQuickAction("explain")}
            disabled={loading}
          >
            <HelpCircle className="h-3.5 w-3.5 text-white/60" />
            Explain board
          </Button>
          <Button
            size="sm"
            variant="onDark"
            className="h-9 flex-1 gap-1.5 px-2 text-[11px]"
            onClick={() => handleQuickAction("brainstorm")}
            disabled={loading}
          >
            <Lightbulb className="h-3.5 w-3.5 text-[#e5c477]" />
            Brainstorm
          </Button>
        </div>

        {aiTextResult && (
          <div className="glass-row relative rounded-2xl border-white/12 p-3.5 text-xs text-white/70">
            <div className="mb-2 flex items-center justify-between font-semibold text-white/85">
              <span
                className="flex items-center gap-1.5 text-[10.5px]"
                title={resultMeta?.model ? `Generated with ${resultMeta.model}` : undefined}
              >
                <Sparkles className="h-3 w-3 text-white/70" />
                {resultMeta?.diagramType || "Notes"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  title="Copy note"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white/40 transition-[background-color,color,transform] hover:bg-white/10 hover:text-white active:scale-[0.9] active:bg-white/15"
                >
                  {copiedText ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleSendToSmartDoc}
                  title="Insert into SmartDoc"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white/40 transition-[background-color,color,transform] hover:bg-white/10 hover:text-white active:scale-[0.9] active:bg-white/15"
                >
                  <FileText className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiTextResult(null)
                    setResultMeta(null)
                  }}
                  className="ml-1 cursor-pointer text-[10px] text-white/35 transition-colors hover:text-white/80 active:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
            {resultMeta?.title && (
              <p className="mb-1.5 text-[10px] font-medium text-white/38">
                {resultMeta.title}
              </p>
            )}
            <div className="no-scrollbar max-h-52 overflow-y-auto whitespace-pre-wrap pr-1 text-[11.5px] font-normal leading-relaxed text-white/62">
              {aiTextResult}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h3 className="mono-label text-white/42">
              Visual mode
            </h3>
            <span className="mono-label text-white/24">
              {AiTools.length} modes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AiTools.map((tool, index) => {
              const Icon = tool.icon
              const isSelected = selectedTool === tool.name
              const isLastOdd =
                index === AiTools.length - 1 && AiTools.length % 2 !== 0

              return (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => {
                    setSelectedTool(tool.name)
                    setSelectedType(tool)
                  }}
                  className={`
                    group relative flex min-h-[3.5rem] items-center gap-2.5
                    rounded-xl border p-2.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] cursor-pointer active:scale-[0.985]
                    ${isLastOdd ? "col-span-2" : "col-span-1"}
                    ${
                      isSelected
                        ? "border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/20"
                        : "border-white/8 bg-white/[0.035] hover:border-white/15 hover:bg-white/[0.075]"
                    }
                  `}
                >
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-white/80" />
                  )}

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/10 ${tool.bgColor} ${tool.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold leading-none tracking-[-0.01em] text-white/88">
                      {tool.name}
                    </p>
                    <p className="mt-1.5 truncate text-[10px] text-white/38">
                      {tool.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="mono-label flex items-center gap-1.5 text-white/42">
              <Layers className="h-3 w-3 text-white/60" /> Output depth
            </span>
            <div className="glass-segmented-dark flex items-center gap-0.5 p-1 text-[10px]">
              <button
                type="button"
                onClick={() => setDetailLevel("standard")}
                className={`cursor-pointer rounded-full px-2.5 py-1.5 transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                  detailLevel === "standard"
                    ? "bg-[#faf9f6] font-semibold text-[#151714] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.6)]"
                    : "text-white/45 hover:text-white/85"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setDetailLevel("enterprise")}
                className={`cursor-pointer rounded-full px-2.5 py-1.5 transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                  detailLevel === "enterprise"
                    ? "bg-[#faf9f6] font-semibold text-[#151714] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.6)]"
                    : "text-white/45 hover:text-white/85"
                }`}
              >
                Detailed
              </button>
            </div>
          </div>

          <div className="mb-2.5 flex items-center justify-between">
            <span className="mono-label flex items-center gap-1.5 text-white/42">
              <RotateCcw className="h-3 w-3 text-white/60" /> Canvas mode
            </span>
            <div className="flex items-center gap-1.5">
              <div className="glass-segmented-dark flex items-center gap-0.5 p-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCanvasMode("replace")}
                  className={`cursor-pointer rounded-full px-2.5 py-1.5 transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                    canvasMode === "replace"
                      ? "bg-[#faf9f6] font-semibold text-[#151714] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.6)]"
                      : "text-white/45 hover:text-white/85"
                  }`}
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode("append")}
                  className={`cursor-pointer rounded-full px-2.5 py-1.5 transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                    canvasMode === "append"
                      ? "bg-[#faf9f6] font-semibold text-[#151714] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.6)]"
                      : "text-white/45 hover:text-white/85"
                  }`}
                >
                  Append
                </button>
              </div>
              <button
                type="button"
                onClick={handleClearCanvas}
                title="Clear whiteboard canvas"
                className="flex cursor-pointer items-center gap-1 rounded-full border border-rose-300/15 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-300/80 transition-[background-color,color,transform] hover:bg-rose-500/16 hover:text-rose-200 active:scale-[0.97]"
              >
                <Trash2 className="h-2.5 w-2.5" /> Clear
              </button>
            </div>
          </div>

          <div className="no-scrollbar mb-2 flex items-center gap-1 overflow-x-auto pb-1">
            {currentToolData.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setUserInput(preset)}
                className="
                  glass-chip-dark h-7 cursor-pointer whitespace-nowrap px-2.5 text-[10px] font-medium
                  transition-[border-color,color,transform] hover:border-white/25 hover:text-white active:scale-[0.97]
                "
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_12px_28px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-150 focus-within:border-white/25 focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/10">
            <textarea
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              placeholder="Describe what you want to understand, map, or build..."
              className="
                min-h-[104px] w-full resize-none border-0 bg-transparent
                px-3.5 py-3 text-[12.5px] leading-relaxed text-[#f4f2ea] shadow-none outline-none
                placeholder:text-white/35 focus:outline-none focus:ring-0
              "
            />

            <div className="flex items-center justify-between border-t border-white/8 px-3 py-2">
              <div className="mono-label flex items-center gap-1.5 text-white/35">
                <Wand2 className="h-2.5 w-2.5 text-white/50" />
                <span>Studio engine</span>
              </div>
              <span className="mono-label text-white/25">
                {userInput.length}/500
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="inverse"
            onClick={onClickGenerate}
            disabled={loading || !userInput.trim() || !excalidrawApi}
            className="mt-3 h-10 w-full cursor-pointer gap-2 px-4 text-[12px]"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {selectedTool === "Auto" ? "Create visual" : "Generate elements"}
            <ArrowUp size={14} className="ml-auto" />
          </Button>
        </div>
      </div>
    </div>
  )
}
