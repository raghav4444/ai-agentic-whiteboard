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
  ArrowUpRight,
  MoreVertical,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Activity,
  Box,
  PanelLeft,
  Workflow,
  Network,
  GitBranch,
  Pencil,
  Square,
  Diamond,
  Type,
  Loader2,
} from "@/lib/icons";
import { useSidebar } from "@/components/ui/sidebar";
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

interface Blueprint {
  id: string;
  title: string;
  category: string;
  description: string;
  elements: number;
  badge: string;
  docSpec: string;
}

const BLUEPRINTS: Blueprint[] = [
  {
    id: "microservices",
    title: "Microservices & Gateway",
    category: "Architecture",
    description: "API Gateway, Kafka stream, auth service & Neon Postgres",
    elements: 18,
    badge: "System",
    docSpec:
      "Distributed microservices topology featuring an edge API Gateway handling TLS termination, JWT verification, and rate limiting. Services communicate asynchronously through Kafka message brokers with primary persistence on Neon Serverless Postgres.",
  },
  {
    id: "auth-flow",
    title: "Auth & Session Lifecycle",
    category: "Security",
    description: "MFA challenge, JWT rotation, OAuth2 and revoke fallback",
    elements: 14,
    badge: "Flow",
    docSpec:
      "Zero-trust session authorization lifecycle using short-lived cryptographically signed JWT tokens, distributed Redis session caching, and immediate token revocation with fallback audit logging.",
  },
  {
    id: "event-pipeline",
    title: "Event-Driven Processing",
    category: "Data",
    description: "Queue consumers, dead-letter storage and sync workers",
    elements: 22,
    badge: "Pipeline",
    docSpec:
      "High-throughput event streaming architecture using partition-keyed Kafka topics. Consumer workers auto-scale based on queue lag, with automatic fallback forwarding to dead-letter queues upon repeated validation failure.",
  },
  {
    id: "product-wireframe",
    title: "Studio Canvas Layout",
    category: "Interface",
    description: "Multi-panel dashboard with floating toolbars and docked cards",
    elements: 16,
    badge: "Blueprint",
    docSpec:
      "Next-generation systems canvas combining infinite panning, physical spring gesture controls, multi-user real-time cursor presence, and an attached markdown architecture specification drawer.",
  },
];

/**
 * Renders live Excalidraw vector elements from a user's canvas.
 * Falls back to an inviting drawing canvas view if empty.
 */
function LiveCanvasRenderer({
  elements,
  loading,
  projectName,
}: {
  elements: any[];
  loading: boolean;
  projectName: string;
}) {
  if (loading) {
    return (
      <div className="flex h-56 w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-white/40" />
      </div>
    );
  }

  const activeElements = Array.isArray(elements)
    ? elements.filter((el) => !el.isDeleted)
    : [];

  if (activeElements.length === 0) {
    return (
      <div className="relative flex h-56 w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-white/25 hover:bg-white/[0.04]">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 shadow-inner">
          <Pencil size={20} />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-[#f4f2ea]">
          Canvas: {projectName}
        </p>
        <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-white/45">
          Click anywhere on this canvas to open the studio whiteboard and start drawing.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60">
            <Square size={11} /> Shapes
          </span>
          <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60">
            <Diamond size={11} /> Flow logic
          </span>
          <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60">
            <Type size={11} /> Architecture text
          </span>
        </div>
      </div>
    );
  }

  // Calculate bounding box of real elements
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  activeElements.forEach((el) => {
    const x = el.x ?? 0;
    const y = el.y ?? 0;
    const w = el.width ?? 0;
    const h = el.height ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });

  const pad = 40;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = Math.max(160, maxX - minX + pad * 2);
  const vbH = Math.max(120, maxY - minY + pad * 2);

  return (
    <div className="relative flex h-60 w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#141715]/85 p-2 shadow-inner">
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="size-full max-h-56"
        preserveAspectRatio="xMidYMid meet"
      >
        {activeElements.map((el, i) => {
          const stroke =
            el.strokeColor &&
            el.strokeColor !== "#000000" &&
            el.strokeColor !== "#1e1e1e"
              ? el.strokeColor
              : "#f4f2ea";
          const fill =
            el.backgroundColor && el.backgroundColor !== "transparent"
              ? el.backgroundColor
              : "rgba(255,255,255,0.06)";
          const strokeWidth = el.strokeWidth || 1.75;

          if (el.type === "rectangle") {
            return (
              <rect
                key={el.id || i}
                x={el.x}
                y={el.y}
                width={Math.max(4, el.width)}
                height={Math.max(4, el.height)}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                rx={el.roundness ? 6 : 2}
              />
            );
          }
          if (el.type === "ellipse") {
            return (
              <ellipse
                key={el.id || i}
                cx={el.x + el.width / 2}
                cy={el.y + el.height / 2}
                rx={Math.max(2, Math.abs(el.width / 2))}
                ry={Math.max(2, Math.abs(el.height / 2))}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            );
          }
          if (el.type === "diamond") {
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${
              el.y + el.height
            } ${el.x},${cy}`;
            return (
              <polygon
                key={el.id || i}
                points={pts}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            );
          }
          if (el.type === "text" && el.text) {
            return (
              <text
                key={el.id || i}
                x={el.x}
                y={el.y + (el.fontSize || 14)}
                fill={stroke}
                fontSize={el.fontSize || 13}
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {el.text}
              </text>
            );
          }
          if (el.type === "arrow" || el.type === "line") {
            const points = el.points || [[0, 0], [el.width, el.height]];
            const d = points.reduce(
              (acc: string, pt: [number, number], idx: number) => {
                const px = el.x + pt[0];
                const py = el.y + pt[1];
                return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
              },
              ""
            );
            return (
              <path
                key={el.id || i}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }
          if (el.type === "freedraw" && el.points) {
            const d = el.points.reduce(
              (acc: string, pt: [number, number], idx: number) => {
                const px = el.x + pt[0];
                const py = el.y + pt[1];
                return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
              },
              ""
            );
            return (
              <path
                key={el.id || i}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

/**
 * Dedicated visual diagram renderer for blueprints
 */
function BlueprintDiagramPreview({ blueprintId }: { blueprintId: string }) {
  if (blueprintId === "microservices") {
    return (
      <div className="relative flex w-full max-w-xl flex-col items-center justify-center">
        <div className="relative flex w-full items-center justify-between gap-2 px-2 py-3">
          {/* Node 1: Web Client */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="mono-label text-[9px] text-white/40">Client Tier</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Network size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">Web / Mobile</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              HTTPS / TLS
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
            <span className="absolute size-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>

          {/* Node 2: API Gateway */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <span className="mono-label text-[9px] text-white/40">Ingress</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/90">
              <Workflow size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">API Gateway</p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-medium text-emerald-300">
              Rate Limit
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
            <span className="absolute size-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>

          {/* Node 3: Neon DB & Kafka */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="mono-label text-[9px] text-white/40">Persistence</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Box size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">Postgres + Kafka</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              Port 5432
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (blueprintId === "auth-flow") {
    return (
      <div className="relative flex w-full max-w-xl flex-col items-center justify-center">
        <div className="relative flex w-full items-center justify-between gap-2 px-2 py-3">
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">Challenge</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Network size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">User Login</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              Credential
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-amber-400/50 to-white/10" />
            <span className="absolute size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">2-Step MFA</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/90">
              <Diamond size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">TOTP Auth</p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-medium text-emerald-300">
              Verified
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-emerald-400/50 to-white/10" />
            <span className="absolute size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">Session</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Box size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">JWT Rotation</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              Redis Store
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (blueprintId === "event-pipeline") {
    return (
      <div className="relative flex w-full max-w-xl flex-col items-center justify-center">
        <div className="relative flex w-full items-center justify-between gap-2 px-2 py-3">
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">Producer</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Network size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">Webhooks</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              Ingest Hook
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-cyan-400/50 to-white/10" />
            <span className="absolute size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">Message Bus</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/90">
              <GitBranch size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">Kafka Queue</p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-medium text-emerald-300">
              x3 Partitions
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-cyan-400/50 to-white/10" />
            <span className="absolute size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="mono-label text-[9px] text-white/40">Sink</span>
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Box size={16} />
            </div>
            <p className="text-[11px] font-semibold text-[#f4f2ea]">Worker Cluster</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
              Dead Letter Q
            </span>
          </div>
        </div>
      </div>
    );
  }

  // product-wireframe fallback
  return (
    <div className="relative flex w-full max-w-xl flex-col items-center justify-center">
      <div className="relative flex w-full items-center justify-between gap-2 px-2 py-3">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <span className="mono-label text-[9px] text-white/40">Surface</span>
          <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
            <Square size={16} />
          </div>
          <p className="text-[11px] font-semibold text-[#f4f2ea]">Infinite Pan</p>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
            60 FPS
          </span>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
          <span className="absolute size-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>

        <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-3 text-center">
          <span className="mono-label text-[9px] text-white/40">Controls</span>
          <div className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/90">
            <Workflow size={16} />
          </div>
          <p className="text-[11px] font-semibold text-[#f4f2ea]">Docked Rails</p>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-medium text-emerald-300">
            Spring Easing
          </span>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
          <span className="absolute size-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>

        <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <span className="mono-label text-[9px] text-white/40">Spec</span>
          <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
            <FileText size={16} />
          </div>
          <p className="text-[11px] font-semibold text-[#f4f2ea]">SmartDoc</p>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-white/50">
            Markdown Spec
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StudioConsole() {
  const router = useRouter();
  const { user } = useUser();
  const { toggleSidebar, open: sidebarOpen } = useSidebar();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "specs" | "templates">("all");
  const [quickPrompt, setQuickPrompt] = useState("");
  const [creatingQuick, setCreatingQuick] = useState(false);

  // Active preview selection state
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>("microservices");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"blueprint" | "project">("blueprint");

  // Real whiteboard elements state
  const [projectElements, setProjectElements] = useState<any[]>([]);
  const [loadingElements, setLoadingElements] = useState(false);

  // Rename & Delete state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetProject, setTargetProject] = useState<Project | null>(null);
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

  const activeBlueprint = useMemo(() => {
    return (
      BLUEPRINTS.find((b) => b.id === activeBlueprintId) || BLUEPRINTS[0]
    );
  }, [activeBlueprintId]);

  const activeSelectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.projectId === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Load real whiteboard elements from database
  const loadProjectElements = useCallback(async (projectId: string) => {
    setLoadingElements(true);
    try {
      const res = await axios.get(`/api/whiteboard?projectId=${projectId}`);
      if (res.data && Array.isArray(res.data.elements)) {
        setProjectElements(res.data.elements);
      } else {
        setProjectElements([]);
      }
    } catch (err) {
      console.error("Failed to load whiteboard elements:", err);
      setProjectElements([]);
    } finally {
      setLoadingElements(false);
    }
  }, []);

  // Handle selecting a recent project
  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.projectId);
    setPreviewMode("project");
    loadProjectElements(project.projectId);
    toast.add({
      type: "info",
      title: "Canvas loaded in preview",
      description: project.projectName,
    });
  };

  // Handle switching to a blueprint
  const handleSelectBlueprint = (id: string) => {
    setActiveBlueprintId(id);
    setSelectedProjectId(null);
    setPreviewMode("blueprint");
    setProjectElements([]);
    toast.add({
      type: "info",
      title: "Blueprint loaded on canvas",
      description: BLUEPRINTS.find((b) => b.id === id)?.title,
    });
  };

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

  const handleLaunchActivePreview = async () => {
    if (previewMode === "project" && activeSelectedProject) {
      router.push(`/workspace/${activeSelectedProject.projectId}`);
      return;
    }

    // Otherwise launch from active blueprint
    setCreatingQuick(true);
    try {
      const projectId = crypto.randomUUID();
      await axios.post("/api/projects", {
        projectName: activeBlueprint.title,
        projectId,
      });
      toast.add({
        type: "success",
        title: "Blueprint loaded",
        description: `Created workspace from "${activeBlueprint.title}"`,
      });
      router.push(`/workspace/${projectId}`);
    } catch (err) {
      console.error(err);
      toast.add({
        type: "error",
        title: "Creation failed",
        description: "Could not initialize blueprint.",
      });
    } finally {
      setCreatingQuick(false);
    }
  };

  const handleRename = async () => {
    if (!targetProject || !newProjectName.trim()) return;
    setActionLoading(true);
    try {
      await axios.patch("/api/projects", {
        projectId: targetProject.projectId,
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
    if (!targetProject) return;
    setActionLoading(true);
    try {
      await axios.delete(`/api/projects?projectId=${targetProject.projectId}`);
      toast.add({ type: "success", title: "Canvas deleted" });
      setDeleteDialogOpen(false);
      if (selectedProjectId === targetProject.projectId) {
        setSelectedProjectId(null);
        setPreviewMode("blueprint");
        setProjectElements([]);
      }
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.add({ type: "error", title: "Failed to delete canvas" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[1440px] py-2 sm:py-4">
      {/* Outer Studio Tablet Console Shell */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-[2.2rem] border border-white/[0.08] bg-[#121513] p-3 shadow-[0_36px_100px_-24px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5 lg:flex-row">
        {/* Subtle noise and light catch */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1.2px)] bg-[size:22px_22px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />

        {/* ==============================================================
            LEFT DOCK (Vertical Tool Rail)
            Matches the circular collapse button, vertical dock pills, and user profile
            ============================================================== */}
        <aside className="relative z-10 flex shrink-0 flex-row items-center justify-between gap-3 lg:flex-col lg:justify-between lg:py-1">
          {/* Top Circular Sidebar Collapse Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle workspace sidebar"
            title={sidebarOpen ? "Collapse sidebar" : "Show workspace sidebar"}
            className="group flex size-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[#f4f2ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-8px_rgba(0,0,0,0.6)] transition-all duration-150 ease-[var(--ease-out)] hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96] sm:size-12"
          >
            <PanelLeft
              size={18}
              className={`text-white/80 transition-transform duration-200 group-hover:scale-105 ${
                sidebarOpen ? "rotate-180 text-white" : ""
              }`}
            />
          </button>

          {/* Center Vertical Dock Pill */}
          <nav
            aria-label="Studio navigation"
            className="flex flex-row items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_12px_28px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:flex-col lg:gap-2.5 lg:py-3"
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
              }}
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
              onClick={() => {
                setActiveTab("recent");
                if (projects.length > 0) {
                  handleSelectProject(projects[0]);
                }
              }}
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
              onClick={() => {
                setActiveTab("templates");
                handleSelectBlueprint("microservices");
              }}
              aria-label="Architecture Blueprints"
              title="Architecture Blueprints"
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
              onClick={() => {
                setActiveTab("specs");
              }}
              aria-label="Living Specifications"
              title="SmartDoc Living Specs"
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
                Interactive preview card that dynamically updates when blueprints or boards are selected.
                Clicking anywhere on the canvas opens the studio workspace! */}
            <div
              onClick={handleLaunchActivePreview}
              title="Click anywhere to open canvas in editor"
              className="group/hero relative flex min-h-[430px] flex-1 cursor-pointer flex-col justify-between overflow-hidden rounded-[1.85rem] border border-white/[0.07] bg-[#191c1a]/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_56px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-200 hover:border-white/20 hover:shadow-[0_30px_70px_-24px_rgba(0,0,0,0.85)] sm:p-7"
            >
              {/* Architectural dot grid */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.1px)] bg-[size:18px_18px] opacity-45"
              />

              {/* Hover indicator banner */}
              <div className="pointer-events-none absolute right-4 top-4 z-20 hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10.5px] font-semibold text-white shadow-lg backdrop-blur-md transition-all group-hover/hero:flex">
                <span>Open in editor</span>
                <ArrowUpRight size={12} />
              </div>

              {/* Top status bar inside hero canvas */}
              <div className="relative z-10 flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2.5">
                  <span className="mono-label text-white/40">Canvas Preview</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                    <span className="size-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    {previewMode === "project" && activeSelectedProject
                      ? activeSelectedProject.projectName
                      : activeBlueprint.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="mono-label rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[9.5px] text-white/50">
                    {previewMode === "project" ? "User Board" : activeBlueprint.category}
                  </span>
                  <button
                    type="button"
                    onClick={handleLaunchActivePreview}
                    disabled={creatingQuick}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:border-white/25 hover:bg-white/[0.14] active:scale-[0.96] disabled:opacity-50"
                  >
                    {previewMode === "project" ? "Open canvas" : "Launch blueprint"}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              {/* CENTER CANVAS VISUAL PREVIEW */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center py-4">
                {activeTab === "specs" ? (
                  /* SmartDoc Specification View */
                  <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121413]/90 p-4 text-left shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="mono-label text-white/50">SmartDoc Spec</span>
                      <span className="mono-label text-[10px] text-emerald-400/80">Living Spec</span>
                    </div>
                    <p className="mt-2.5 text-[12.5px] font-semibold text-[#f4f2ea]">
                      {previewMode === "project" && activeSelectedProject
                        ? activeSelectedProject.projectName
                        : activeBlueprint.title}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                      {activeBlueprint.docSpec}
                    </p>
                  </div>
                ) : previewMode === "project" && activeSelectedProject ? (
                  /* Live Canvas Elements Renderer for User's Selected Board */
                  <div className="flex w-full flex-col items-center justify-center">
                    <LiveCanvasRenderer
                      elements={projectElements}
                      loading={loadingElements}
                      projectName={activeSelectedProject.projectName}
                    />
                    <div className="mt-3 text-center">
                      <h1 className="text-[20px] font-semibold tracking-[-0.035em] text-[#f4f2ea] sm:text-[23px]">
                        Editing{" "}
                        <span className="font-editorial text-white/90">
                          {activeSelectedProject.projectName}
                        </span>
                      </h1>
                      <p className="mt-1 text-[12px] text-white/50">
                        {projectElements.length > 0
                          ? `Rendering ${projectElements.length} vector elements from database. Click to open and edit.`
                          : `Canvas created on ${new Date(
                              activeSelectedProject.createdAt
                            ).toLocaleDateString()}. Click to draw.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Blueprint Architecture Diagram Preview */
                  <div className="flex w-full flex-col items-center justify-center">
                    <BlueprintDiagramPreview blueprintId={activeBlueprint.id} />
                    <div className="mt-3 text-center">
                      <h1 className="text-[20px] font-semibold tracking-[-0.035em] text-[#f4f2ea] sm:text-[23px]">
                        Systems Blueprint:{" "}
                        <span className="font-editorial text-white/90">
                          {activeBlueprint.title}
                        </span>
                      </h1>
                      <p className="mt-1 text-[12px] text-white/50">
                        {activeBlueprint.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Bottom Prompt & Launch Capsule */}
              <div
                className="relative z-10 mt-auto pt-2"
                onClick={(e) => e.stopPropagation()}
              >
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
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/[0.06] bg-[#161816]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5">
              {/* Header Pill */}
              <div className="flex items-center justify-between">
                <span className="mono-label text-white/40">Studio Metrics</span>
                <span className="mono-label text-white/35">Engine v2.4</span>
              </div>

              {/* 3 Metric Capsules Grid */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Capsule 1: Canvases */}
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Canvases</span>
                    <Box size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    {projects.length}
                    <span className="ml-1 text-[11px] font-normal text-white/40">active</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Click to view all</p>
                </button>

                {/* Capsule 2: SmartDoc */}
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Living Spec</span>
                    <FileText size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    SmartDoc
                    <span className="ml-1 text-[11px] font-normal text-white/40">linked</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Click to view specs</p>
                </button>

                {/* Capsule 3: Real-Time Sync */}
                <button
                  type="button"
                  onClick={() => {
                    toast.add({
                      type: "info",
                      title: "Real-time SSE Sync",
                      description: "Collaborative presence and delta synchronization active.",
                    });
                  }}
                  className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-white/40">Sync State</span>
                    <Activity size={13} className="text-white/40" />
                  </div>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#f4f2ea]">
                    Real-time
                    <span className="ml-1 text-[11px] font-normal text-white/40">SSE</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">Delta merge active</p>
                </button>
              </div>

              {/* Bottom activity rail / slider */}
              <div className="mt-3.5 flex items-center gap-3 border-t border-white/[0.05] pt-3">
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
              Matches the Search Pill + Layered Board Cards + Fanned Template Deck
              ============================================================== */}
          <div className="flex flex-col gap-3.5">
            {/* TOP RIGHT SEARCH CAPSULE */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boards and blueprints..."
                className="h-11 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 text-[12px] text-[#f4f2ea] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06] focus:outline-none"
              />
            </div>

            {/* LAYERED RECENT BOARD CARDS
                Matches the stacked cards with rounded left notch tabs from the wireframe */}
            <div className="relative flex flex-col gap-2 rounded-[1.7rem] border border-white/[0.06] bg-[#161816]/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="mono-label text-white/40">
                  {activeTab === "all" ? "All Canvases" : "Recent Canvases"}
                </span>
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
                <div className="no-scrollbar flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                  {filteredProjects
                    .slice(0, activeTab === "all" ? 10 : 3)
                    .map((project) => {
                      const isSelected =
                        previewMode === "project" &&
                        selectedProjectId === project.projectId;

                      return (
                        <div
                          key={project.projectId}
                          onClick={() => handleSelectProject(project)}
                          className={`group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-[14px] border p-3 transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.99] ${
                            isSelected
                              ? "border-white/25 bg-white/[0.08] shadow-sm"
                              : "border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                          }`}
                        >
                          {/* Left rounded tab indicator matching the wireframe */}
                          <span
                            className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full transition ${
                              isSelected
                                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                                : "bg-white/25 group-hover:bg-white/70"
                            }`}
                          />

                          <div className="min-w-0 flex-1 pl-2.5">
                            <p
                              className={`truncate text-[12.5px] font-semibold transition ${
                                isSelected ? "text-white" : "text-[#f4f2ea] group-hover:text-white"
                              }`}
                            >
                              {project.projectName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-white/40">
                              <Calendar size={10} />
                              {new Date(project.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => router.push(`/workspace/${project.projectId}`)}
                              aria-label={`Open ${project.projectName}`}
                              title="Open in editor"
                              className="flex size-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                            >
                              <ArrowUpRight size={13} />
                            </button>

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
                                  onClick={() => router.push(`/workspace/${project.projectId}`)}
                                  className="gap-2 text-xs"
                                >
                                  <ArrowUpRight size={13} /> Open canvas
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetProject(project);
                                    setNewProjectName(project.projectName);
                                    setRenameDialogOpen(true);
                                  }}
                                  className="gap-2 text-xs"
                                >
                                  <Edit3 size={13} /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetProject(project);
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
                      );
                    })}
                </div>
              )}
            </div>

            {/* FANNED DECK OF BLUEPRINT CARDS
                Matches the stacked, fanned-out blueprint cards. Clicking dynamically updates the canvas preview! */}
            <div className="relative mt-auto overflow-hidden rounded-[1.7rem] border border-white/[0.06] bg-[#161816]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="mb-2 flex items-center justify-between">
                <span className="mono-label text-white/40">Blueprints</span>
                <span className="mono-label text-[10px] text-white/35">Click to preview</span>
              </div>

              {/* Fanned Card Stack */}
              <div className="group/fan relative mt-2 flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-black/25 p-2">
                {BLUEPRINTS.map((tpl, i) => {
                  const isSelected =
                    previewMode === "blueprint" && activeBlueprintId === tpl.id;

                  const rotations = [-6, -2, 2, 6];
                  const defaultRotation = rotations[i % rotations.length];

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={creatingQuick}
                      onClick={() => handleSelectBlueprint(tpl.id)}
                      className={`absolute w-48 rounded-xl border p-3 text-left shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85)] transition-all duration-200 ease-[var(--ease-out)] active:scale-95 ${
                        isSelected
                          ? "!z-50 !rotate-0 !scale-105 border-white/40 bg-[#252a27] shadow-[0_18px_36px_-8px_rgba(0,0,0,0.9)] ring-1 ring-white/30"
                          : "border-white/[0.1] bg-[#1d211f] hover:border-white/30 hover:bg-[#232725]"
                      }`}
                      style={{
                        zIndex: isSelected ? 50 : (i + 1) * 10,
                        transform: isSelected
                          ? "rotate(0deg) scale(1.05) translateY(-4px)"
                          : `rotate(${defaultRotation}deg) translateY(${i * 2}px)`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="mono-label text-[9px] text-white/45">
                          {tpl.category}
                        </span>
                        {isSelected && (
                          <span className="flex size-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
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
                <span>Select to change canvas</span>
                <button
                  type="button"
                  onClick={handleLaunchActivePreview}
                  className="flex items-center gap-1 font-semibold text-white/80 transition hover:text-white"
                >
                  Load blueprint <ChevronRight size={11} />
                </button>
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
              "{targetProject?.projectName}"
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
