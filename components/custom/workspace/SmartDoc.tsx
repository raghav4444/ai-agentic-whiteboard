"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Copy,
  Download,
  Check,
  Loader2,
  List,
  Heading,
  Code,
  Bold,
  ArrowUpRight,
  Lock,
} from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import axios from 'axios'
import type { CollabSession } from './useCollabSession'
import type { PersistedDoc } from '@/lib/collab/types'

const DEFAULT_TITLE = "Project Architecture & Requirements"
const DEFAULT_CONTENT = `# Architecture & Product Specs

## Overview
Describe your application goals, target audience, and key performance indicators here.

## Core Architecture
- **Client Layer**: Next.js App Router with TypeScript
- **Database Layer**: Neon Serverless Postgres with Drizzle ORM
- **AI Pipeline**: Gemini for real-time diagram synthesis

## User Journey & Flows
1. User logs in via Clerk authentication.
2. Navigates to dashboard and launches a new whiteboard.
3. Uses AI assistant to generate architecture and flow diagrams.
4. Documents technical specifications in SmartDoc.
`

type Props = {
  session: CollabSession
  readOnly?: boolean
}

function signature(title: string, content: string): string {
  return `${title.length}:${content.length}:${title.slice(0, 32)}:${content.slice(-48)}`
}

function SmartDoc({ session, readOnly = false }: Props) {
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [content, setContent] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const titleRef = useRef(DEFAULT_TITLE)
  const contentRef = useRef("")
  const initializedRef = useRef(false)
  const appliedRemoteAtRef = useRef(0)
  const appliedRemoteSignatureRef = useRef("")
  const lastPushedSignatureRef = useRef("")
  const dirtyRef = useRef(false)
  const suppressPushRef = useRef(false)
  const inFlightRef = useRef(false)
  const pushAgainRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pushDocRef = useRef<() => Promise<void>>(async () => {})

  const projectId = session.projectId
  const storageKey = `smartdoc_${projectId}`
  const pushDocToSession = session.pushDoc
  const reportSyncStatus = session.reportSyncStatus
  const identityName = session.identity?.name

  useEffect(() => {
    titleRef.current = title
  }, [title])

  useEffect(() => {
    contentRef.current = content
  }, [content])

  const applyDoc = useCallback((doc: PersistedDoc) => {
    const nextSignature = signature(doc.title, doc.content)
    appliedRemoteAtRef.current = Math.max(appliedRemoteAtRef.current, doc.updatedAt)
    appliedRemoteSignatureRef.current = nextSignature
    lastPushedSignatureRef.current = nextSignature
    suppressPushRef.current = true
    setTitle(doc.title || DEFAULT_TITLE)
    setContent(doc.content || "")
    titleRef.current = doc.title || DEFAULT_TITLE
    contentRef.current = doc.content || ""
    initializedRef.current = true
    setInitialized(true)
    dirtyRef.current = false
    requestAnimationFrame(() => {
      suppressPushRef.current = false
    })
  }, [])

  // Restore the shared document. The local copy is only a fallback while the
  // collaboration snapshot is still in flight.
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrating from the collaboration snapshot and localStorage is an external-store read. */
  useEffect(() => {
    if (session.doc) {
      appliedRemoteSignatureRef.current = signature(
        session.doc.title,
        session.doc.content
      )
      if (
        !dirtyRef.current &&
        (!initializedRef.current ||
          session.doc.updatedAt > appliedRemoteAtRef.current)
      ) {
        applyDoc(session.doc)
      } else if (!initializedRef.current) {
        initializedRef.current = true
        setInitialized(true)
      }
      return
    }

    if (initializedRef.current) return
    if (session.connection === "connecting") return

    let restored = false
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as {
          title?: string
          content?: string
        }
        setTitle(parsed.title || DEFAULT_TITLE)
        setContent(parsed.content || DEFAULT_CONTENT)
        titleRef.current = parsed.title || DEFAULT_TITLE
        contentRef.current = parsed.content || DEFAULT_CONTENT
        restored = true
      }
    } catch {
      // A malformed local draft should not block the shared document.
    }

    if (!restored) {
      setContent(DEFAULT_CONTENT)
      contentRef.current = DEFAULT_CONTENT
    }

    initializedRef.current = true
    setInitialized(true)
  }, [applyDoc, session.connection, session.doc, storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Local cache fallback for offline editing.
  useEffect(() => {
    if (!initialized) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ title, content, savedAt: Date.now() })
      )
    } catch {
      // Local storage is optional.
    }
  }, [content, initialized, storageKey, title])

  const pushDoc = useCallback(async () => {
    if (readOnly || !initializedRef.current) return
    if (inFlightRef.current) {
      pushAgainRef.current = true
      return
    }

    const next: PersistedDoc = {
      title: titleRef.current || DEFAULT_TITLE,
      content: contentRef.current,
      updatedAt: Date.now(),
      updatedBy: identityName || "Teammate",
    }
    const nextSignature = signature(next.title, next.content)
    if (nextSignature === lastPushedSignatureRef.current) {
      dirtyRef.current = false
      return
    }

    inFlightRef.current = true
    dirtyRef.current = false

    const merged = await pushDocToSession(next)
    inFlightRef.current = false

    if (merged) {
      lastPushedSignatureRef.current = signature(merged.title, merged.content)
      appliedRemoteAtRef.current = Math.max(
        appliedRemoteAtRef.current,
        merged.updatedAt
      )

      if (signature(titleRef.current, contentRef.current) !== nextSignature) {
        dirtyRef.current = true
      } else if (
        merged.content !== contentRef.current ||
        merged.title !== titleRef.current
      ) {
        applyDoc(merged)
      }
    } else {
      dirtyRef.current = true
      reportSyncStatus("offline")
    }

    if (pushAgainRef.current) {
      pushAgainRef.current = false
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null
        void pushDocRef.current()
      }, 200)
    }
  }, [applyDoc, identityName, pushDocToSession, readOnly, reportSyncStatus])

  useEffect(() => {
    pushDocRef.current = pushDoc
  }, [pushDoc])

  // Debounced push. Suppressed while a remote document is being applied.
  useEffect(() => {
    if (!initialized || readOnly) return
    if (suppressPushRef.current) return

    const nextSignature = signature(title, content)
    if (nextSignature === lastPushedSignatureRef.current) return

    dirtyRef.current = true
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null
      void pushDoc()
    }, 800)

    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
    }
  }, [content, initialized, pushDoc, readOnly, title])

  useEffect(() => {
    const handleInsert = (event: Event) => {
      if (readOnly) return
      const detail = (event as CustomEvent<{ content?: string }>).detail
      if (detail?.content) {
        const snippet = detail.content
        setContent((prev) => (prev ? `${prev}\n\n${snippet}` : snippet))
      }
    }
    window.addEventListener("smartdoc:insert-content", handleInsert)
    return () => {
      window.removeEventListener("smartdoc:insert-content", handleInsert)
    }
  }, [readOnly])

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [])

  const handleGenerateAiSpecs = async () => {
    if (readOnly || !aiPrompt.trim() || loading) return
    setLoading(true)

    try {
      const res = await axios.post("/api/ai", {
        userInput: aiPrompt.trim(),
        action: "smartdoc",
        projectId,
        shareToken: session.shareToken,
        context: [
          { type: "document", text: titleRef.current },
          { type: "document", text: contentRef.current.slice(-2400) },
        ],
      })

      if (res.data?.response) {
        setContent((prev) => prev + "\n\n" + res.data.response)
        setAiPrompt("")
        toast.add({
          type: "success",
          title: "Documentation generated",
          description: "AI specs were appended to the shared SmartDoc.",
        })
      } else {
        toast.add({
          type: "error",
          title: "Generation failed",
          description: res.data?.detail || res.data?.error || "The AI returned no text.",
        })
      }
    } catch (err) {
      console.error(err)
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: unknown; error?: unknown } | undefined)
        : undefined
      const detail = typeof data?.detail === "string" ? data.detail : ""
      const message = typeof data?.error === "string" ? data.error : ""
      toast.add({
        type: "error",
        title: "Generation failed",
        description: detail || message || "Could not generate AI documentation.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.add({ type: "success", title: "Copied to clipboard" })
    } catch {
      toast.add({
        type: "error",
        title: "Copy failed",
        description: "The browser blocked clipboard access.",
      })
    }
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ type: "success", title: "Downloaded markdown file" })
  }

  const insertSnippet = (prefix: string, suffix: string = "") => {
    if (readOnly) return
    setContent((prev) => prev + "\n" + prefix + suffix)
  }

  const syncLabel =
    session.syncStatus === "offline"
      ? "Saved locally"
      : session.syncStatus === "saving"
        ? "Syncing"
        : "Live"

  return (
    <div className="relative isolate flex h-full w-full flex-col overflow-hidden bg-[#fbfaf6] md:flex-row">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(21,23,20,0.065)_1px,transparent_1.1px)] bg-[size:24px_24px] opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(70%_100%_at_20%_0%,rgba(252,246,232,0.9),transparent_72%)]"
      />

      <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[#151714]/8 px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="mono-label text-[#2aab70]">SmartDoc · living spec</p>
                <span className="h-px w-8 bg-[#2aab70]/25" />
                <span className="mono-label text-[#6c726d]/40">Shared</span>
                <span className="glass-chip h-6 gap-1 px-2 text-[9.5px] font-semibold text-[#065f46]">
                  <span
                    className={`size-1 rounded-full ${
                      syncLabel === "Saved locally"
                        ? "bg-[#b07b22]"
                        : "bg-[#2aab70]"
                    }`}
                  />
                  {syncLabel}
                </span>
                {readOnly && (
                  <span className="glass-chip h-6 gap-1 px-2 text-[9.5px] font-semibold text-[#6c726d]">
                    <Lock size={9} />
                    View only
                  </span>
                )}
              </div>
              <Input
                value={title}
                readOnly={readOnly}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 h-10 max-w-xl border-none bg-transparent px-0 font-editorial-caps text-[25px] leading-none tracking-[-0.04em] text-[#151714] shadow-none focus-visible:ring-0 md:text-[25px]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="h-9 gap-1.5 px-3.5 text-[11.5px]"
              >
                {copied ? <Check size={13} className="text-[#2aab70]" /> : <Copy size={13} />}
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-9 gap-1.5 px-3.5 text-[11.5px]"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export .md</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-b border-[#151714]/7 px-5 py-2 sm:px-7">
          <span className="mono-label mr-2 text-[#6c726d]/45">Insert</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            className="size-8 p-0"
            onClick={() => insertSnippet("### Section Title")}
            title="Heading"
          >
            <Heading size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            className="size-8 p-0"
            onClick={() => insertSnippet("**Bold Text**")}
            title="Bold"
          >
            <Bold size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            className="size-8 p-0"
            onClick={() => insertSnippet("- Feature Item")}
            title="List"
          >
            <List size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            className="size-8 p-0"
            onClick={() => insertSnippet("```ts\nconst data = 1;\n```")}
            title="Code block"
          >
            <Code size={14} />
          </Button>

          <span className="mono-label ml-auto text-[#6c726d]/35">
            {session.participants.length > 0
              ? `${session.participants.length} online`
              : "Markdown"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <div className="mx-auto max-w-3xl">
            <Textarea
              value={content}
              readOnly={readOnly}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type the requirements, decisions and notes that belong beside the diagram..."
              className="min-h-[560px] w-full resize-none border-none bg-transparent p-0 font-mono text-[13.5px] leading-[1.9] text-[#3c423d] shadow-none placeholder:text-[#6c726d]/40 focus-visible:ring-0 md:text-[13.5px]"
            />
          </div>
        </div>
      </div>

      <aside
        data-glass-reactive
        className="glass-aside relative z-10 flex w-full shrink-0 flex-col border-t border-[#151714]/8 md:w-[330px] md:border-t-0 md:border-l lg:w-[380px]"
      >
        <div className="border-b border-[#151714]/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-full border border-[#2aab70]/20 bg-[#2aab70]/9 text-[#065f46] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="mono-label text-[#2aab70]">AI co-writer</p>
              <h3 className="mt-1 text-[13.5px] font-semibold tracking-[-0.025em] text-[#151714]">
                Draft the next section
              </h3>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <Textarea
            value={aiPrompt}
            disabled={readOnly}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={
              readOnly
                ? "This share link is view-only. Ask the owner for edit access to generate specs."
                : "e.g. Write the technical requirements for a realtime collaborative canvas with presence and autosave."
            }
            className="min-h-[132px] resize-none text-[12.5px] leading-relaxed"
          />

          <Button
            onClick={handleGenerateAiSpecs}
            disabled={readOnly || loading || !aiPrompt.trim()}
            className="mt-3 h-10 w-full gap-2 text-[12px]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-[#a7e8c8]" />}
            Generate specifications
          </Button>

          <div className="mt-7 border-t border-[#151714]/8 pt-5">
            <p className="mono-label text-[#6c726d]/50">Starting points</p>
            <div className="mt-2">
              {[
                "Draft system architecture specification",
                "Generate API endpoint table & data models",
                "Create sprint stories & acceptance criteria",
                "Summarize whiteboard design decisions",
              ].map((promptText, index) => (
                <button
                  key={promptText}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setAiPrompt(promptText)}
                  className="group flex w-full cursor-pointer items-start gap-2.5 border-b border-[#151714]/7 py-3 text-left transition-[background-color,color,transform] last:border-b-0 hover:text-[#065f46] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="mono-label mt-0.5 text-[#2aab70]/65">0{index + 1}</span>
                  <span className="flex-1 text-[11.5px] leading-relaxed text-[#6c726d] transition-colors group-hover:text-[#065f46]">
                    {promptText}
                  </span>
                  <ArrowUpRight size={12} className="mt-0.5 shrink-0 text-[#6c726d]/35 transition-colors group-hover:text-[#065f46]" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#151714]/8 p-5">
          <p className="text-[10.5px] leading-relaxed text-[#6c726d]/60">
            SmartDoc is stored with this board&apos;s shared session, so every
            editor sees the same spec beside the diagram.
          </p>
        </div>
      </aside>
    </div>
  )
}

export default SmartDoc
