"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "@/components/ui/toast";
import {
  Folder,
  Search,
  Plus,
  Layers,
  LayoutGrid,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  MoreVertical,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Activity,
  Box,
} from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CreateNewBoardDialog from "./CreateNewBoardDialog";

export interface Project {
  id: number;
  projectId: string;
  projectName: string;
  userEmail: string;
  createdAt: string;
}

const TEMPLATES = [
  {
    id: "microservices",
    title: "Microservices & Gateway",
    category: "Architecture",
    description: "API Gateway, Kafka stream, auth service & Neon Postgres",
    elements: 18,
    badge: "System",
  },
  {
    id: "auth-flow",
    title: "Auth & Session Lifecycle",
    category: "Security",
    description: "MFA challenge, JWT rotation, OAuth2 and revoke fallback",
    elements: 14,
    badge: "Flow",
  },
  {
    id: "event-pipeline",
    title: "Event-Driven Processing",
    category: "Data",
    description: "Queue consumers, dead-letter storage and sync workers",
    elements: 22,
    badge: "Pipeline",
  },
  {
    id: "product-wireframe",
    title: "Studio Canvas Layout",
    category: "Interface",
    description: "Multi-panel dashboard with floating toolbars and docked cards",
    elements: 16,
    badge: "Blueprint",
  },
];

export default function StudioConsole() {
  const router = useRouter();
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "specs" | "templates">("all");
  const [quickPrompt, setQuickPrompt] = useState("");
  const [creatingQuick, setCreatingQuick] = useState(false);

  // Rename & Delete state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get("/api/projects");
      if (Array.isArray(res.data)) {
        setProjects(res.data);
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
      toast.add({
        type: "error",
        title: "Could not load canvases",
        description: "Failed to connect to the database.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) =>
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const latestProject = projects[0] || null;

  const handleQuickCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = quickPrompt.trim() || `Studio canvas ${projects.length + 1}`;
    setCreatingQuick(true);
    try {
      const projectId = crypto.randomUUID();
      await axios.post("/api/projects", {
        projectName: title,
        projectId,
      });
      toast.add({
        type: "success",
        title: "Canvas initialized",
        description: `Created "${title}"`,
      });
      setQuickPrompt("");
      router.push(`/workspace/${projectId}`);
    } catch (err) {
      console.error(err);
      toast.add({
        type: "error",
        title: "Creation failed",
        description: "Could not create canvas.",
      });
    } finally {
      setCreatingQuick(false);
    }
  };

  const handleCreateFromTemplate = async (templateTitle: string) => {
    setCreatingQuick(true);
    try {
      const projectId = crypto.randomUUID();
      await axios.post("/api/projects", {
        projectName: templateTitle,
        projectId,
      });
      toast.add({
        type: "success",
        title: "Template loaded",
        description: `Created canvas from "${templateTitle}"`,
      });
      router.push(`/workspace/${projectId}`);
    } catch (err) {
      console.error(err);
      toast.add({
        type: "error",
        title: "Creation failed",
        description: "Could not load template.",
      });
    } finally {
      setCreatingQuick(false);
    }
  };

  const handleRename = async () => {
    if (!selectedProject || !newProjectName.trim()) return;
    setActionLoading(true);
    try {
      await axios.patch("/api/projects", {
        projectId: selectedProject.projectId,
        projectName: newProjectName.trim(),
      });
      toast.add({ type: "success", title: "Canvas renamed" });
      setRenameDialogOpen(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.add({ type: "error", title: "Failed to rename canvas" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setActionLoading(true);
    try {
      await axios.delete(`/api/projects?projectId=${selectedProject.projectId}`);
      toast.add({ type: "success", title: "Canvas deleted" });
      setDeleteDialogOpen(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.add({ type: "error", title: "Failed to delete canvas" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[1440px] py-4 sm:py-6">
      {/* Outer Studio Tablet Console Shell */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-[2.2rem] border border-white/[0.08] bg-[#121513] p-3 shadow-[0_36px_100px_-24px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5 lg:flex-row">
        {/* Subtle noise and light catch */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1.2px)] bg-[size:22px_22px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />

        {/* ==============================================================
            LEFT DOCK (Vertical Tool Rail)
            Matches the circular brand button, vertical icon dock, and user profile
            ============================================================== */}
        <aside className="relative z-10 flex shrink-0 flex-row items-center justify-between gap-3 lg:flex-col lg:justify-between lg:py-1">
          {/* Top Brand Circle */}
          <Link
            href="/dashboard"
            aria-label="Studio Home"
            className="group flex size-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-8px_rgba(0,0,0,0.6)] transition-all duration-150 ease-[var(--ease-out)] hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96] sm:size-12"
          >
            <Sparkles size={18} className="text-white/80 transition-transform duration-200 group-hover:scale-110" />
          </Link>

          {/* Center Vertical Dock Pill */}
          <nav
            aria-label="Studio navigation"
            className="flex flex-row items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_12px_28px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:flex-col lg:gap-2.5 lg:py-3"
          >
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              aria-label="All Canvases"
              title="All Canvases"
              className={`relative flex size-9 items-center justify-center rounded-full transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.95] sm:size-10 ${
                activeTab === "all"
                  ? "bg-white/[0.14] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
              }`}
            >
              <LayoutGrid size={16} />
              {activeTab === "all" && (
                <span className="absolute bottom-1 size-1 rounded-full bg-white/90 lg:bottom-auto lg:right-1.5 lg:top-1.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("recent")}
              aria-label="Recent Workspaces"
              title="Recent Workspaces"
              className={`relative flex size-9 items-center justify-center rounded-full transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.95] sm:size-10 ${
                activeTab === "recent"
                  ? "bg-white/[0.14] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
              }`}
            >
              <Clock size={16} />
              {activeTab === "recent" && (
                <span className="absolute bottom-1 size-1 rounded-full bg-white/90 lg:bottom-auto lg:right-1.5 lg:top-1.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              aria-label="Architecture Templates"
              title="Architecture Templates"
              className={`relative flex size-9 items-center justify-center rounded-full transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.95] sm:size-10 ${
                activeTab === "templates"
                  ? "bg-white/[0.14] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
              }`}
            >
              <Layers size={16} />
              {activeTab === "templates" && (
                <span className="absolute bottom-1 size-1 rounded-full bg-white/90 lg:bottom-auto lg:right-1.5 lg:top-1.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              aria-label="Living Specifications"
              title="SmartDoc Specifications"
              className={`relative flex size-9 items-center justify-center rounded-full transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.95] sm:size-10 ${
                activeTab === "specs"
                  ? "bg-white/[0.14] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
              }`}
            >
              <FileText size={16} />
              {activeTab === "specs" && (
                <span className="absolute bottom-1 size-1 rounded-full bg-white/90 lg:bottom-auto lg:right-1.5 lg:top-1.5" />
              )}
            </button>
          </nav>

          {/* Bottom Profile Avatar & Quick New Button */}
          <div className="flex items-center gap-2 lg:flex-col lg:gap-2.5">
            <CreateNewBoardDialog
              onBoardCreated={fetchProjects}
              buttonVariant="inverse"
              buttonLabel=""
              buttonClassName="size-9 sm:size-10 rounded-full p-0 flex items-center justify-center"
            />
            <div className="flex size-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] p-0.5 shadow-sm sm:size-10">
              <UserButton />
            </div>
          </div>
        </aside>

        {/* ==============================================================
            MAIN CONSOLE BODY (Center Canvas + Bottom Metrics + Right Wing)
            ============================================================== */}
        <div className="relative z-10 grid min-w-0 flex-1 grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(330px,0.7fr)]">
          {/* CENTER STACK: Hero Canvas + Bottom Bento Metrics */}
          <div className="flex flex-col gap-3.5">
            {/* HERO CANVAS CARD
                Matches the large rounded central card with the notch on left and quick pill bar */}
            <div className="group relative flex min-h-[360px] flex-1 flex-col justify-between overflow-hidden rounded-[1.85rem] border border-white/[0.07] bg-[#191c1a]/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_56px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-7">
              {/* Subtle architectural dot grid inside canvas preview */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.1px)] bg-[size:18px_18px] opacity-45"
              />

              {/* Top status bar inside hero canvas */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="mono-label text-white/40">Studio Console</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                    <span className="size-1.5 rounded-full bg-white/60" />
                    {latestProject ? latestProject.projectName : "Empty canvas"}
                  </span>
                </div>

                {latestProject && (
                  <Link
                    href={`/workspace/${latestProject.projectId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.96]"
                  >
                    Open canvas <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>

              {/* Center Canvas Glyph / Interactive Visual Focal Point */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6 text-center">
                <div className="relative flex size-20 items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_18px_40px_-14px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105 sm:size-24">
                  {/* Geometric glyph representation matching wireframe */}
                  <div className="relative size-10 text-white/70">
                    <div className="absolute inset-x-0 bottom-0 top-2 rounded-[8px] border border-white/40 bg-white/[0.08]" />
                    <div className="absolute right-1 top-0 size-3 rounded-full border border-white/50 bg-white/30" />
                    <div className="absolute bottom-1.5 left-2 h-2.5 w-5 rounded-[4px] bg-white/20" />
                  </div>
                </div>

                <h1 className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.04em] text-[#f4f2ea] sm:text-[26px]">
                  {latestProject ? (
                    <>
                      Continue working on{" "}
                      <span className="font-editorial text-white/90">
                        {latestProject.projectName}.
                      </span>
                    </>
                  ) : (
                    <>
                      A blank surface for{" "}
                      <span className="font-editorial text-white/90">
                        systems thinking.
                      </span>
                    </>
                  )}
                </h1>

                <p className="mt-2 max-w-[28rem] text-[12.5px] leading-relaxed text-white/50">
                  {latestProject
                    ? "Your diagrams, specifications, and architecture decisions stay organized in one place."
                    : "Draw technical diagrams, explore microservice relationships, and attach living specifications."}
                </p>
              </div>

              {/* Floating Bottom Prompt & Launch Capsule
                  Matches the (+) button and input capsule drawn on the bottom of the wireframe card */}
              <div className="relative z-10 mt-auto pt-4">
                <form
                  onSubmit={handleQuickCreate}
                  className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-white/[0.12] bg-[#141615]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_36px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all focus-within:border-white/25 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
                >
                  <button
                    type="submit"
                    disabled={creatingQuick}
                    aria-label="Create new board"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#121513] shadow-sm transition hover:bg-white/90 active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>

                  <input
                    type="text"
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    placeholder="Create new canvas or specify architecture topic..."
                    className="min-w-0 flex-1 bg-transparent px-2 text-[12.5px] text-[#f4f2ea] placeholder:text-white/35 focus:outline-none"
                  />

                  <Button
                    type="submit"
                    disabled={creatingQuick}
                    variant="inverse"
                    className="h-8 rounded-full px-3.5 text-[11px] font-semibold tracking-wide"
                  >
                    {creatingQuick ? "Creating..." : "Initialize"}
                  </Button>
                </form>
              </div>
            </div>

            {/* BOTTOM BENTO METRICS BOX
                Matches the segmented bento card with metric capsules and bottom activity slider */}
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/[0.06] bg-[#161816]/90 p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5">
              {/* Header Pill */}
              <div className="flex items-center justify-between">
                <span className="mono-label text-white/40">Studio Metrics</span>
                <span className="mono-label text-white/35">Engine v2.4</span>
              </div>

              {/* 3 Metric Capsules Grid */}
              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Capsule 1: Canvases */}
                <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 transition hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Canvases</span>
                    <Box size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    {projects.length}
                    <span className="ml-1 text-[11px] font-normal text-white/40">active</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Infinite canvas surface</p>
                </div>

                {/* Capsule 2: SmartDoc */}
                <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 transition hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Living Spec</span>
                    <FileText size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    SmartDoc
                    <span className="ml-1 text-[11px] font-normal text-white/40">linked</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Markdown architecture</p>
                </div>

                {/* Capsule 3: Real-Time Sync */}
                <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 transition hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Sync State</span>
                    <Activity size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    Real-time
                    <span className="ml-1 text-[11px] font-normal text-white/40">SSE</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Delta merge & presence</p>
                </div>
              </div>

              {/* Bottom activity rail / slider */}
              <div className="mt-4 flex items-center gap-3 border-t border-white/[0.05] pt-3">
                <span className="mono-label text-[9px] text-white/35">Storage status</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white/70 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(12, (projects.length / 10) * 100))}%`,
                    }}
                  />
                </div>
                <span className="mono-label text-[9.5px] text-white/45">
                  {projects.length} of 10 canvases
                </span>
              </div>
            </div>
          </div>

          {/* ==============================================================
              RIGHT COLUMN STACK
              Matches the Search Pill + 3 Layered Board Cards + Fanned Template Deck
              ============================================================== */}
          <div className="flex flex-col gap-3.5">
            {/* TOP RIGHT SEARCH CAPSULE */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boards and specs..."
                className="h-11 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 text-[12px] text-[#f4f2ea] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06] focus:outline-none"
              />
            </div>

            {/* LAYERED RECENT BOARD CARDS
                Matches the 3 stacked cards with rounded left notch tabs from the wireframe */}
            <div className="relative flex flex-col gap-2 rounded-[1.7rem] border border-white/[0.06] bg-[#161816]/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="mono-label text-white/40">Recent Canvases</span>
                <span className="mono-label text-white/35">{filteredProjects.length} total</span>
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-[14px] bg-white/[0.03]" />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[12px] text-white/40">No canvases found</p>
                  <p className="mt-1 text-[11px] text-white/25">Use the prompt bar to initialize one</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredProjects.slice(0, 3).map((project, index) => (
                    <div
                      key={project.projectId}
                      className="group relative flex items-center justify-between overflow-hidden rounded-[14px] border border-white/[0.06] bg-white/[0.03] p-3 transition-all duration-150 ease-[var(--ease-out)] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-0.5 active:scale-[0.99]"
                    >
                      {/* Left rounded tab indicator matching the wireframe */}
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white/30 transition group-hover:bg-white/80" />

                      <Link
                        href={`/workspace/${project.projectId}`}
                        className="min-w-0 flex-1 pl-2.5"
                      >
                        <p className="truncate text-[12.5px] font-semibold text-[#f4f2ea] group-hover:text-white">
                          {project.projectName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-white/40">
                          <Calendar size={10} />
                          {new Date(project.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/workspace/${project.projectId}`}
                          aria-label={`Open ${project.projectName}`}
                          className="flex size-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                        >
                          <ArrowUpRight size={13} />
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Options"
                              className="flex size-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProject(project);
                                setNewProjectName(project.projectName);
                                setRenameDialogOpen(true);
                              }}
                              className="gap-2 text-xs"
                            >
                              <Edit3 size={13} /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProject(project);
                                setDeleteDialogOpen(true);
                              }}
                              className="gap-2 text-xs text-red-500 focus:text-red-500"
                            >
                              <Trash2 size={13} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FANNED DECK OF TEMPLATE CARDS
                Matches the stacked, fanned-out cards at the bottom right of the wireframe */}
            <div className="relative mt-auto overflow-hidden rounded-[1.7rem] border border-white/[0.06] bg-[#161816]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="mb-2 flex items-center justify-between">
                <span className="mono-label text-white/40">Blueprints</span>
                <span className="mono-label text-white/35">Click to load</span>
              </div>

              {/* Fanned Card Stack */}
              <div className="group/fan relative mt-2 flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-black/20 p-2">
                {TEMPLATES.map((tpl, i) => {
                  const rotations = ["-rotate-6", "-rotate-2", "rotate-3", "rotate-6"];
                  const zIndexes = [10, 20, 30, 40];
                  const xOffsets = ["-translate-x-6", "-translate-x-2", "translate-x-2", "translate-x-6"];
                  const rotation = rotations[i % rotations.length];
                  const xOffset = xOffsets[i % xOffsets.length];

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={creatingQuick}
                      onClick={() => handleCreateFromTemplate(tpl.title)}
                      className={`absolute w-44 rounded-xl border border-white/[0.1] bg-[#202422] p-3 text-left shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85)] transition-all duration-200 ease-[var(--ease-out)] group-hover/fan:${xOffset} group-hover/fan:${rotation} hover:!scale-105 hover:!border-white/30 hover:!z-50 active:scale-95`}
                      style={{
                        zIndex: zIndexes[i],
                        transform: `rotate(${(i - 1.5) * 5}deg) translateY(${i * 2}px)`,
                      }}
                    >
                      <span className="mono-label text-[9px] text-white/40">{tpl.category}</span>
                      <p className="mt-1 truncate text-[11.5px] font-semibold text-[#f4f2ea]">
                        {tpl.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[9.5px] text-white/40">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/40">
                <span>Select any blueprint</span>
                <span className="flex items-center gap-1 font-medium text-white/70">
                  Instant launch <ChevronRight size={11} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Rename Canvas</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Canvas name"
              autoFocus
              className="h-10"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="inverse"
              onClick={handleRename}
              disabled={actionLoading || !newProjectName.trim()}
            >
              {actionLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-500">
              Delete Canvas
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              "{selectedProject?.projectName}"
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete canvas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
