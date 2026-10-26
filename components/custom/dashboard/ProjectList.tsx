"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Folder, Search, MoreVertical, Trash2, Edit3, Calendar, Loader2, ArrowUpRight, RotateCcw, Clock, LayoutGrid, Eye } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import CreateNewBoardDialog from './CreateNewBoardDialog'
import BoardPreview from './BoardPreview'
import axios from 'axios'
import { toast } from '@/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Project {
  id: number;
  projectId: string;
  projectName: string;
  userEmail: string;
  createdAt: string;
  deletedAt?: string | null;
}

type LibraryView = "boards" | "trash"

function formatDate(value?: string | null) {
  if (!value) return "Recently"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ProjectList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [projectList, setProjectList] = useState<Project[]>([])
  const [trashList, setTrashList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDialogOpen, setPermanentDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewProject, setPreviewProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const view: LibraryView = searchParams.get("view") === "trash" ? "trash" : "boards"
  const setView = useCallback(
    (next: LibraryView) => {
      router.replace(next === "trash" ? `${pathname}?view=trash` : pathname, {
        scroll: false,
      })
    },
    [pathname, router]
  )

  const loadProjects = useCallback(async (trash: boolean): Promise<Project[] | null> => {
    try {
      const res = await axios.get(trash ? "/api/projects?trash=1" : "/api/projects")
      return Array.isArray(res.data) ? (res.data as Project[]) : null
    } catch (err) {
      console.error(`Failed to load ${trash ? "recycle bin" : "projects"}:`, err)
      return null
    }
  }, [])

  const refreshLibrary = useCallback(async () => {
    const [active, trash] = await Promise.all([
      loadProjects(false),
      loadProjects(true),
    ])

    if (active) setProjectList(active)
    if (trash) setTrashList(trash)

    if (active || trash) {
      window.dispatchEvent(new Event("scribeboard:library-changed"))
    }

    if (!active && !trash) {
      toast.add({
        type: "error",
        title: "Could not load boards",
        description: "Failed to connect to the database.",
      })
    }
  }, [loadProjects])

  useEffect(() => {
    let cancelled = false

    Promise.all([loadProjects(false), loadProjects(true)]).then(
      ([active, trash]) => {
        if (cancelled) return
        if (active) setProjectList(active)
        if (trash) setTrashList(trash)
        if (!active && !trash) {
          toast.add({
            type: "error",
            title: "Could not load boards",
            description: "Failed to connect to the database.",
          })
        }
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
    }
  }, [loadProjects, view])

  const restoreProject = useCallback(
    async (project: Project, switchView = true) => {
      setActionLoading(true)
      try {
        await axios.patch("/api/projects", {
          projectId: project.projectId,
          restore: true,
        })
        await refreshLibrary()
        setPreviewOpen(false)
        setPermanentDialogOpen(false)
        setSelectedProject(null)
        if (switchView) setView("boards")
        toast.add({ type: "success", title: "Board restored" })
        return true
      } catch (err) {
        console.error(err)
        toast.add({ type: "error", title: "Failed to restore board" })
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [refreshLibrary, setView]
  )

  const handleRename = async () => {
    if (!selectedProject || !newProjectName.trim()) return
    setActionLoading(true)
    try {
      await axios.patch("/api/projects", {
        projectId: selectedProject.projectId,
        projectName: newProjectName.trim(),
      })
      toast.add({ type: "success", title: "Board renamed" })
      setRenameDialogOpen(false)
      await refreshLibrary()
    } catch (err) {
      console.error(err)
      toast.add({ type: "error", title: "Failed to rename board" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleMoveToTrash = async () => {
    if (!selectedProject) return
    const project = selectedProject
    setActionLoading(true)
    try {
      await axios.delete(`/api/projects?projectId=${project.projectId}`)
      setDeleteDialogOpen(false)
      await refreshLibrary()
      toast.add({
        type: "success",
        title: "Moved to recycle bin",
        description: `"${project.projectName}" can be restored anytime.`,
        actionProps: {
          children: "Undo",
          onClick: () => {
            void restoreProject(project, false)
          },
        },
      })
    } catch (err) {
      console.error(err)
      toast.add({ type: "error", title: "Failed to move board to recycle bin" })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!selectedProject) return
    const project = selectedProject
    setActionLoading(true)
    try {
      await axios.delete(
        `/api/projects?projectId=${project.projectId}&permanent=1`
      )
      setPermanentDialogOpen(false)
      setPreviewOpen(false)
      setPreviewProject(null)
      await refreshLibrary()
      toast.add({
        type: "success",
        title: "Board permanently deleted",
        description: `"${project.projectName}" is gone for good.`,
      })
    } catch (err) {
      console.error(err)
      toast.add({ type: "error", title: "Failed to permanently delete board" })
    } finally {
      setActionLoading(false)
    }
  }

  const openPreview = (project: Project) => {
    setPreviewProject(project)
    setPreviewOpen(true)
  }

  const openPermanentDelete = (project: Project) => {
    setSelectedProject(project)
    setPreviewOpen(false)
    setPermanentDialogOpen(true)
  }

  const activeProjects = projectList.filter((project) =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const trashedProjects = trashList.filter((project) =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredProjects = view === "boards" ? activeProjects : trashedProjects
  const isTrash = view === "trash"

  return (
    <div className="mt-9 space-y-5">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mono-label text-[#6c726d]/65">Your library</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
            <h2 className="text-[29px] font-semibold leading-none tracking-[-0.05em] text-[#151714]">
              {isTrash ? (
                <>Recycle <span className="font-editorial font-normal text-[#065f46]">bin</span></>
              ) : (
                <>Recent <span className="font-editorial font-normal text-[#065f46]">boards</span></>
              )}
            </h2>
            <span className="glass-chip mb-0.5 h-6 px-2.5 text-[10px] font-semibold tabular-nums">
              {loading
                ? "—"
                : `${filteredProjects.length} ${
                    isTrash
                      ? "deleted"
                      : filteredProjects.length === 1
                        ? "canvas"
                        : "canvases"
                  }`}
            </span>
            <button
              type="button"
              onClick={() => setView(isTrash ? "boards" : "trash")}
              aria-pressed={isTrash}
              className="glass-chip mb-0.5 inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold text-[#065f46] transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-out)] hover:border-[#2aab70]/35 hover:bg-[#fcf6e8] active:scale-[0.97]"
            >
              {isTrash ? <LayoutGrid size={11} /> : <Trash2 size={11} />}
              {isTrash ? "All boards" : "Recycle bin"}
              {!isTrash && trashList.length > 0 && (
                <span className="flex min-w-4 items-center justify-center rounded-full bg-[#2aab70]/10 px-1 text-[9px] tabular-nums text-[#065f46]">
                  {trashList.length}
                </span>
              )}
            </button>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#6c726d]">
            {isTrash
              ? "Deleted boards wait here. Preview a canvas before you restore it or remove it forever."
              : "Every canvas keeps its diagram, decisions and spec together."}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#6c726d]/80" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTrash ? "Search recycle bin" : "Search boards"}
              aria-label={isTrash ? "Search recycle bin" : "Search boards"}
              className="h-11 rounded-full pl-9 text-[12px] placeholder:text-[#6c726d]/70"
            />
          </div>
          <CreateNewBoardDialog
            onBoardCreated={refreshLibrary}
            buttonClassName="h-11 gap-2 px-4.5"
            buttonLabel="New board"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-row-light flex items-center gap-4 p-3.5">
              <div className="h-[76px] w-[108px] shrink-0 animate-pulse rounded-xl bg-[#151714]/5 sm:h-[88px] sm:w-[132px]" />
              <div className="flex-1 space-y-2.5">
                <div className="h-2 w-16 animate-pulse rounded-full bg-[#151714]/6" />
                <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-[#151714]/7" />
                <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-[#151714]/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel-soft relative mt-2 flex flex-col items-center justify-center overflow-hidden p-12 text-center sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(229,196,119,0.12),transparent_66%)] blur-2xl"
          />
          <div className={`relative flex size-12 items-center justify-center rounded-full border ${isTrash ? "border-[#151714]/10 bg-[#151714]/4 text-[#6c726d]" : "border-[#2aab70]/18 bg-[#2aab70]/8 text-[#065f46]"}`}>
            {isTrash ? <Trash2 size={20} /> : <Folder size={20} />}
          </div>
          <p className={`mono-label relative mt-5 ${isTrash ? "text-[#6c726d]/70" : "text-[#2aab70]"}`}>
            {isTrash ? "Recycle bin" : "Blank canvas"}
          </p>
          <h3 className="relative mt-2 text-[30px] font-semibold tracking-[-0.05em] text-[#151714]">
            {isTrash ? (
              searchQuery ? "No matching boards." : <>Nothing <span className="font-editorial font-normal text-[#065f46]">deleted.</span></>
            ) : searchQuery ? (
              "No matching boards."
            ) : (
              <>Nothing here <span className="font-editorial font-normal text-[#065f46]">yet.</span></>
            )}
          </h3>
          <p className="relative mt-2 mb-6 max-w-sm text-[12px] leading-relaxed text-[#6c726d]">
            {isTrash
              ? searchQuery
                ? `No deleted boards match "${searchQuery}". Try a different name.`
                : "Boards you move here stay recoverable until you permanently delete them."
              : searchQuery
                ? `No whiteboards match "${searchQuery}". Try a different name.`
                : "Start with a name. The infinite canvas, AI assistant and SmartDoc are already waiting inside."}
          </p>
          {isTrash ? (
            <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => setView("boards")}>
              <LayoutGrid size={14} /> Back to boards
            </Button>
          ) : (
            <CreateNewBoardDialog onBoardCreated={refreshLibrary} buttonClassName="h-11 gap-2 px-5" buttonLabel="Start a board" />
          )}
        </div>
      ) : isTrash ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <div
              key={project.projectId}
              data-glass-reactive
              className="glass-row-light group relative flex items-center gap-3 p-3 sm:gap-4 sm:p-3.5"
            >
              <button
                type="button"
                onClick={() => openPreview(project)}
                aria-label={`Preview ${project.projectName}`}
                className="group/preview relative h-[76px] w-[108px] shrink-0 cursor-pointer overflow-hidden rounded-[13px] border border-[#151714]/10 bg-[#fbf8f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_24px_-20px_rgba(21,23,20,0.55)] outline-none transition-transform duration-300 ease-[var(--ease-out)] hover:scale-[1.035] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-[#2aab70]/25 sm:h-[88px] sm:w-[132px]"
              >
                <BoardPreview
                  projectId={project.projectId}
                  projectName={project.projectName}
                  className="h-full w-full"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#151714]/38 opacity-0 transition-opacity duration-150 group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[9px] font-semibold text-[#151714] shadow-sm">
                    <Eye size={11} /> Preview
                  </span>
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <span className="mono-label text-rose-500/70">In recycle bin</span>
                <p className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.03em] text-[#151714]">
                  {project.projectName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#6c726d]/70">
                  <Clock size={10} />
                  <span>Deleted {formatDate(project.deletedAt || project.createdAt)}</span>
                  <span className="mx-0.5 size-1 rounded-full bg-[#6c726d]/25" />
                  <span>Restore or delete</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Restore ${project.projectName}`}
                  title="Restore board"
                  disabled={actionLoading}
                  onClick={() => void restoreProject(project)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-[#065f46] transition-[background-color,color,transform] hover:bg-[#2aab70]/10 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Permanently delete ${project.projectName}`}
                  title="Delete permanently"
                  disabled={actionLoading}
                  onClick={() => openPermanentDelete(project)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-rose-600/80 transition-[background-color,color,transform] hover:bg-rose-500/10 hover:text-rose-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredProjects.map((project, index) => (
            <div
              key={project.projectId}
              data-glass-reactive
              className="glass-row-light group relative flex items-center gap-3 p-3 sm:gap-4 sm:p-3.5"
            >
              <button
                type="button"
                onClick={() => openPreview(project)}
                aria-label={`Preview ${project.projectName}`}
                className="group/preview relative h-[76px] w-[108px] shrink-0 cursor-pointer overflow-hidden rounded-[13px] border border-[#151714]/10 bg-[#fbf8f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_24px_-20px_rgba(21,23,20,0.55)] outline-none transition-transform duration-300 ease-[var(--ease-out)] hover:scale-[1.035] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-[#2aab70]/25 sm:h-[88px] sm:w-[132px]"
              >
                <BoardPreview
                  projectId={project.projectId}
                  projectName={project.projectName}
                  className="h-full w-full"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#151714]/38 opacity-0 transition-opacity duration-150 group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[9px] font-semibold text-[#151714] shadow-sm">
                    <Eye size={11} /> Preview
                  </span>
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <span className="mono-label text-[#6c726d]/45">
                  Canvas {String(index + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`/workspace/${project.projectId}`}
                  className="mt-1.5 block truncate text-[15px] font-semibold tracking-[-0.03em] text-[#151714] transition-colors group-hover:text-[#065f46] active:text-[#065f46]"
                >
                  {project.projectName}
                </Link>
                <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#6c726d]/70">
                  <Calendar size={10} />
                  <span>{formatDate(project.createdAt)}</span>
                  <span className="mx-0.5 size-1 rounded-full bg-[#6c726d]/25" />
                  <span>Infinite canvas</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Board options for ${project.projectName}`}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6c726d] transition-[background-color,color,transform] hover:bg-[#151714]/6 hover:text-[#151714] active:scale-[0.94]"
                  >
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => openPreview(project)}
                    className="cursor-pointer gap-2"
                  >
                    <Eye size={14} /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProject(project)
                      setNewProjectName(project.projectName)
                      setRenameDialogOpen(true)
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <Edit3 size={14} /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProject(project)
                      setDeleteDialogOpen(true)
                    }}
                    className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600"
                  >
                    <Trash2 size={14} /> Move to recycle bin
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href={`/workspace/${project.projectId}`}
                aria-label={`Open ${project.projectName}`}
                className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-[#151714]/10 bg-white/30 text-[#151714]/60 transition-all duration-200 ease-[var(--ease-out)] group-hover:border-[#151714] group-hover:bg-[#151714] group-hover:text-[#faf9f6] active:scale-[0.94] sm:flex"
              >
                <ArrowUpRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      )}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <p className="mono-label text-[#2aab70]">Rename</p>
            <DialogTitle className="mt-2 text-[22px] tracking-[-0.04em]">Name the board</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Board name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={actionLoading || !newProjectName.trim()}
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onOpenChangeComplete={(open) => {
          if (!open) setSelectedProject(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <p className="mono-label text-rose-500">Recycle bin</p>
            <DialogTitle className="mt-2 text-[22px] tracking-[-0.04em] text-rose-700">
              Move this canvas to the bin?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] leading-relaxed text-[#6c726d]">
            &ldquo;{selectedProject?.projectName}&rdquo; will leave your library, but its canvas will stay safe in the recycle bin. You can restore it anytime.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={handleMoveToTrash}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Move to recycle bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onOpenChangeComplete={(open) => {
          if (!open) setPreviewProject(null)
        }}
      >
        <DialogContent
          className="max-h-[88vh] overflow-y-auto"
          style={{ maxWidth: "min(48rem, calc(100vw - 2rem))" }}
        >
          <DialogHeader>
            <p className="mono-label text-[#2aab70]">
              {previewProject?.deletedAt ? "Recycle bin preview" : "Canvas preview"}
            </p>
            <DialogTitle className="mt-2 truncate text-[24px] leading-[1.05] tracking-[-0.045em]">
              {previewProject?.projectName || "Board"}
            </DialogTitle>
          </DialogHeader>
          {previewProject && (
            <>
              <div className="overflow-hidden rounded-[18px] border border-[#151714]/10 bg-[#fbf8f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <BoardPreview
                  projectId={previewProject.projectId}
                  projectName={previewProject.projectName}
                  className="h-[240px] w-full sm:h-[360px]"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] leading-relaxed text-[#6c726d]">
                <span>
                  {previewProject.deletedAt
                    ? `Deleted ${formatDate(previewProject.deletedAt)}. Restore it or delete it permanently.`
                    : "A read-only snapshot of the saved canvas."}
                </span>
                <span className="mono-label text-[#6c726d]/45">
                  {previewProject.deletedAt ? "Recycle bin" : "Saved canvas"}
                </span>
              </div>
              <DialogFooter>
                {previewProject.deletedAt ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => openPermanentDelete(previewProject)}
                      disabled={actionLoading}
                    >
                      <Trash2 size={14} /> Delete permanently
                    </Button>
                    <Button
                      onClick={() => void restoreProject(previewProject)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Restore board
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => router.push(`/workspace/${previewProject.projectId}`)}>
                      Open board <ArrowUpRight size={14} />
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={permanentDialogOpen}
        onOpenChange={setPermanentDialogOpen}
        onOpenChangeComplete={(open) => {
          if (!open) setSelectedProject(null)
        }}
      >
        <DialogContent
          className="max-h-[88vh] overflow-y-auto"
          style={{ maxWidth: "min(42rem, calc(100vw - 2rem))" }}
        >
          <DialogHeader>
            <p className="mono-label text-rose-500">Permanent delete</p>
            <DialogTitle className="mt-2 text-[22px] tracking-[-0.04em] text-rose-700">
              Delete this canvas forever?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] leading-relaxed text-[#6c726d]">
            &ldquo;{selectedProject?.projectName}&rdquo; and every shape, decision and SmartDoc note inside it will be permanently removed. This cannot be undone.
          </p>
          {selectedProject && (
            <div className="overflow-hidden rounded-[18px] border border-rose-200/70 bg-[#fbf8f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <BoardPreview
                projectId={selectedProject.projectId}
                projectName={selectedProject.projectName}
                className="h-[220px] w-full sm:h-[300px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermanentDialogOpen(false)}
              disabled={actionLoading}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectList
