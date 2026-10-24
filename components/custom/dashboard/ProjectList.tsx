"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Folder, Search, MoreVertical, Trash2, Edit3, Calendar, Loader2, ArrowUpRight } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import CreateNewBoardDialog from './CreateNewBoardDialog'
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
}

function ProjectList() {
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const loadProjects = useCallback(async (): Promise<Project[] | null> => {
    try {
      const res = await axios.get("/api/projects")
      return Array.isArray(res.data) ? (res.data as Project[]) : null
    } catch (err) {
      console.error("Failed to load projects:", err)
      toast.add({
        type: "error",
        title: "Could not load boards",
        description: "Failed to connect to the database.",
      })
      return null
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    const projects = await loadProjects()
    if (projects) setProjectList(projects)
  }, [loadProjects])

  useEffect(() => {
    let cancelled = false
    loadProjects().then((projects) => {
      if (cancelled) return
      if (projects) setProjectList(projects)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadProjects])

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
      fetchProjects()
    } catch (err) {
      console.error(err)
      toast.add({ type: "error", title: "Failed to rename board" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProject) return
    setActionLoading(true)
    try {
      await axios.delete(`/api/projects?projectId=${selectedProject.projectId}`)
      toast.add({ type: "success", title: "Board deleted" })
      setDeleteDialogOpen(false)
      fetchProjects()
    } catch (err) {
      console.error(err)
      toast.add({ type: "error", title: "Failed to delete board" })
    } finally {
      setActionLoading(false)
    }
  }

  const filteredProjects = projectList.filter((p) =>
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="mt-9 space-y-5">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mono-label text-[#6c726d]/65">Your library</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
            <h2 className="text-[29px] font-semibold leading-none tracking-[-0.05em] text-[#151714]">
              Recent <span className="font-editorial font-normal text-[#065f46]">boards</span>
            </h2>
            <span className="glass-chip mb-0.5 h-6 px-2.5 text-[10px] font-semibold tabular-nums">
              {loading ? "—" : filteredProjects.length} canvases
            </span>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#6c726d]">
            Every canvas keeps its diagram, decisions and spec together.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#6c726d]/80" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards"
              aria-label="Search boards"
              className="h-11 rounded-full pl-9 text-[12px] placeholder:text-[#6c726d]/70"
            />
          </div>
          <CreateNewBoardDialog
            onBoardCreated={fetchProjects}
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
            className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(42,171,112,0.11),transparent_66%)] blur-2xl"
          />
          <div className="relative flex size-12 items-center justify-center rounded-full border border-[#2aab70]/18 bg-[#2aab70]/8 text-[#065f46]">
            <Folder size={20} />
          </div>
          <p className="mono-label relative mt-5 text-[#2aab70]">Blank canvas</p>
          <h3 className="relative mt-2 text-[30px] font-semibold tracking-[-0.05em] text-[#151714]">
            {searchQuery ? "No matching boards." : <>Nothing here <span className="font-editorial font-normal text-[#065f46]">yet.</span></>}
          </h3>
          <p className="relative mt-2 mb-6 max-w-sm text-[12px] leading-relaxed text-[#6c726d]">
            {searchQuery
              ? `No whiteboards match "${searchQuery}". Try a different name.`
              : "Start with a name. The infinite canvas, AI assistant and SmartDoc are already waiting inside."}
          </p>
          <CreateNewBoardDialog onBoardCreated={fetchProjects} buttonClassName="h-11 gap-2 px-5" buttonLabel="Start a board" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredProjects.map((project, index) => (
            <div
              key={project.projectId}
              data-glass-reactive
              className="glass-row-light group relative flex items-center gap-3 p-3 sm:gap-4 sm:p-3.5"
            >
              <Link
                href={`/workspace/${project.projectId}`}
                aria-label={`Open ${project.projectName}`}
                className="shrink-0 rounded-xl outline-none transition-transform active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-[#2aab70]/25"
              >
                <BoardThumbnail index={index} />
              </Link>

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
                  <span>
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently created"}
                  </span>
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
                    <Trash2 size={14} /> Delete
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <p className="mono-label text-rose-500">Delete</p>
            <DialogTitle className="mt-2 text-[22px] tracking-[-0.04em] text-rose-700">
              Remove this canvas?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] leading-relaxed text-[#6c726d]">
            &ldquo;{selectedProject?.projectName}&rdquo; and every shape, decision and SmartDoc note inside it will be permanently removed.
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
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BoardThumbnail({ index = 0 }: { index?: number }) {
  const rotations = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3"]
  return (
    <div className="relative h-[76px] w-[108px] shrink-0 overflow-hidden rounded-[13px] border border-[#151714]/10 bg-[#fbf8f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_24px_-20px_rgba(21,23,20,0.55)] transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.035] group-hover:-rotate-[0.5deg] sm:h-[88px] sm:w-[132px]">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(21,23,20,0.16)_1px,transparent_1px)] bg-[size:12px_12px] opacity-65" />
      <span className={`absolute left-2.5 top-3 h-6 w-14 rounded-[5px] border border-[#2aab70]/60 bg-[#2aab70]/16 sm:left-4 sm:top-4 sm:h-8 sm:w-20 ${rotations[index % rotations.length]}`} />
      <span className="absolute right-3 top-8 size-5 rounded-full border border-[#b07b22]/55 bg-[#e5c477]/30 sm:right-4 sm:top-11 sm:size-7" />
      <span className="absolute bottom-2.5 left-[42%] h-4 w-10 rounded-[4px] border border-[#151714]/30 bg-white/80 sm:bottom-3 sm:h-5 sm:w-14" />
      <span className="absolute left-10 top-[26px] h-px w-6 rotate-[18deg] bg-[#151714]/35 sm:left-14 sm:top-9 sm:w-8" />
      <span className="absolute bottom-4 right-8 h-px w-7 -rotate-[28deg] bg-[#151714]/30 sm:bottom-5 sm:right-10 sm:w-9" />
      <span className="absolute bottom-2 left-2.5 h-1 w-1 rounded-full bg-[#151714]/40 sm:bottom-2.5 sm:left-3" />
      <span className="absolute bottom-2 right-2.5 h-1 w-1 rounded-full bg-[#151714]/30 sm:bottom-2.5 sm:right-3" />
    </div>
  )
}

export default ProjectList
