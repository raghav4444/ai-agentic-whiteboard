"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
} from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import axios from 'axios'

function SmartDoc() {
  const { projectid } = useParams()
  const [title, setTitle] = useState("Project Architecture & Requirements")
  const [content, setContent] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!projectid) return

    // Load the persisted document after the first paint. Doing this in a
    // microtask keeps hydration deterministic while still restoring local work.
    const timer = setTimeout(() => {
      const saved = localStorage.getItem(`smartdoc_${projectid}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setTitle(parsed.title || "Project Architecture & Requirements")
          setContent(parsed.content || "")
        } catch {
          setContent(saved)
        }
      } else {
        setContent(
          `# Architecture & Product Specs\n\n## Overview\nDescribe your application goals, target audience, and key performance indicators here.\n\n## Core Architecture\n- **Client Layer**: Next.js App Router with TypeScript\n- **Database Layer**: Neon Serverless Postgres with Drizzle ORM\n- **AI Pipeline**: Gemini for real-time diagram synthesis\n\n## User Journey & Flows\n1. User logs in via Clerk authentication.\n2. Navigates to dashboard and launches a new whiteboard.\n3. Uses AI assistant to generate architecture and flow diagrams.\n4. Documents technical specifications in SmartDoc.\n`
        )
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [projectid])

  useEffect(() => {
    const handleInsert = (event: Event) => {
      const detail = (event as CustomEvent<{ content?: string }>).detail
      if (detail?.content) {
        const snippet = detail.content
        setContent((prev) => prev ? `${prev}\n\n${snippet}` : snippet)
      }
    }
    window.addEventListener("smartdoc:insert-content", handleInsert)
    return () => {
      window.removeEventListener("smartdoc:insert-content", handleInsert)
    }
  }, [])

  useEffect(() => {
    if (!projectid || !content) return
    const timer = setTimeout(() => {
      localStorage.setItem(
        `smartdoc_${projectid}`,
        JSON.stringify({ title, content })
      )
    }, 1500)
    return () => clearTimeout(timer)
  }, [title, content, projectid])

  const handleGenerateAiSpecs = async () => {
    if (!aiPrompt.trim() || loading) return
    setLoading(true)

    try {
      const res = await axios.post("/api/ai", {
        userInput: aiPrompt.trim(),
        action: "smartdoc",
      })

      if (res.data?.response) {
        setContent((prev) => prev + "\n\n" + res.data.response)
        setAiPrompt("")
        toast.add({
          type: "success",
          title: "Documentation Generated",
          description: "AI specs appended to your SmartDoc.",
        })
      } else {
        toast.add({
          type: "error",
          title: "Generation Failed",
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
        title: "Generation Failed",
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
      toast.add({ type: "success", title: "Copied to Clipboard" })
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
    toast.add({ type: "success", title: "Downloaded Markdown File" })
  }

  const insertSnippet = (prefix: string, suffix: string = "") => {
    setContent((prev) => prev + "\n" + prefix + suffix)
  }

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
                <span className="mono-label text-[#6c726d]/40">Markdown</span>
              </div>
              <Input
                value={title}
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
            className="size-8 p-0"
            onClick={() => insertSnippet("### Section Title")}
            title="Heading"
          >
            <Heading size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0"
            onClick={() => insertSnippet("**Bold Text**")}
            title="Bold"
          >
            <Bold size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0"
            onClick={() => insertSnippet("- Feature Item")}
            title="List"
          >
            <List size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0"
            onClick={() => insertSnippet("```ts\nconst data = 1;\n```")}
            title="Code block"
          >
            <Code size={14} />
          </Button>

          <span className="mono-label ml-auto text-[#6c726d]/35">Plain text</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <div className="mx-auto max-w-3xl">
            <Textarea
              value={content}
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
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Write the technical requirements for a realtime collaborative canvas with presence and autosave."
            className="min-h-[132px] resize-none text-[12.5px] leading-relaxed"
          />

          <Button
            onClick={handleGenerateAiSpecs}
            disabled={loading || !aiPrompt.trim()}
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
                  onClick={() => setAiPrompt(promptText)}
                  className="group flex w-full cursor-pointer items-start gap-2.5 border-b border-[#151714]/7 py-3 text-left transition-[background-color,color,transform] last:border-b-0 hover:text-[#065f46] active:translate-y-px"
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
            SmartDoc is stored with this board&apos;s canvas, so the diagram and its reasoning travel together.
          </p>
        </div>
      </aside>
    </div>
  )
}

export default SmartDoc
