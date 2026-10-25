"use client"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    useSidebar,
} from "@/components/ui/sidebar"
import Image from "next/image"
import Link from "next/link"
import { SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar"
import { LayoutGrid, Sparkles, Folder, Wand2, Zap, ArrowUpRight, Discord, Github, Linkedin, PanelLeft } from "@/lib/icons"
import { usePathname } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { UserButton, useUser } from "@clerk/nextjs"
import CreateNewBoardDialog from "./CreateNewBoardDialog"
import { useContext, useEffect, useState } from "react"
import { UserDetailContext } from "@/context/UserDetailContext"
import axios from "axios"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ProjectItem {
    id: number;
    projectId: string;
    projectName: string;
}

const SOCIAL_LINKS = {
    discord: "https://discord.gg/a3FzwUmCQ",
    github: "https://github.com/raghav4444",
    linkedin: "https://www.linkedin.com/in/raghvendra-singh4444/",
} as const;

export function AppSidebar() {
    const path = usePathname();
    const { user } = useUser();
    const { userDetail } = useContext(UserDetailContext) || {};
    const { toggleSidebar } = useSidebar();
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [aiModalOpen, setAiModalOpen] = useState(false);

    useEffect(() => {
        const fetchUserProjects = async () => {
            try {
                const res = await axios.get("/api/projects");
                if (Array.isArray(res.data)) {
                    setProjects(res.data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchUserProjects();
    }, []);

    const maxFreeBoards = 10;
    const boardCount = projects.length;
    const progressValue = Math.min(100, Math.round((boardCount / maxFreeBoards) * 100));

    return (
        <Sidebar
            variant="floating"
            collapsible="offcanvas"
            className="glass-sidebar"
            data-glass-reactive
        >
            <SidebarHeader className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="group -m-1.5 flex items-center gap-3 rounded-2xl p-1.5 transition-[background-color,transform] duration-150 hover:bg-white/35 active:scale-[0.99]"
                    >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] border border-white/90 bg-[linear-gradient(145deg,rgba(255,253,247,0.9),rgba(255,250,240,0.5))] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_22px_-14px_rgba(21,23,20,0.45)] backdrop-blur-md">
                            <Image src="/logo.svg" alt="ScribeBoard" width={25} height={25} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-[15px] font-extrabold leading-none tracking-[-0.05em] text-[#151714]">
                                Scribe<span>Board</span>
                            </h1>
                            <span className="mono-label mt-1.5 block text-[#6c726d]/70">
                                Studio Canvas
                            </span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label="Collapse sidebar"
                        title="Collapse sidebar"
                        className="flex size-8 items-center justify-center rounded-xl border border-black/8 bg-white/40 text-[#6c726d] transition-colors hover:bg-white/80 hover:text-[#151714] active:scale-95"
                    >
                        <PanelLeft size={15} />
                    </button>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-3 pb-2">
                <SidebarGroup className="p-0">
                    <CreateNewBoardDialog
                        buttonClassName="h-11 w-full justify-center gap-2 px-4 text-[12.5px]"
                        buttonLabel="New board"
                    />
                    <p className="mt-2.5 px-1 text-center text-[11px] leading-relaxed text-[#6c726d]/65">
                        A blank canvas with living specifications and diagrams.
                    </p>
                </SidebarGroup>

                <SidebarGroup className="mt-6 p-0">
                    <SidebarGroupLabel className="mono-label px-2 text-[#6c726d]/65">
                        Workspace
                    </SidebarGroupLabel>
                    <div className="mt-2 space-y-1">
                        <Link href="/dashboard" className="block">
                            <SidebarMenuButton
                                className="glass-nav-item h-10 cursor-pointer px-3"
                                isActive={path === "/dashboard"}
                            >
                                <LayoutGrid size={16} />
                                <span className="text-[12.5px] font-semibold">All boards</span>
                                {path === "/dashboard" && (
                                    <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-[#151714]/10">
                                        <span className="size-1.5 rounded-full bg-[#151714]" />
                                    </span>
                                )}
                            </SidebarMenuButton>
                        </Link>

                        <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
                            <DialogTrigger asChild>
                                <SidebarMenuButton className="glass-nav-item h-10 cursor-pointer px-3" isActive={false}>
                                    <Sparkles size={16} />
                                    <span className="text-[12.5px] font-medium">Design blueprints</span>
                                    <span className="mono-label ml-auto text-[#6c726d]/35">?</span>
                                </SidebarMenuButton>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3 text-[20px] tracking-[-0.035em]">
                                        <span className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#151714]">
                                            <Wand2 size={16} />
                                        </span>
                                        Architecture Blueprint Guide
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-1 text-xs">
                                    <p className="text-[13px] leading-relaxed text-[#6c726d]">
                                        Explore standard patterns for designing distributed architectures and system flows.
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            ["Flowcharts", "Onboarding, checkout, approvals — decision logic kept readable."],
                                            ["System architecture", "Services, queues, data stores and the boundaries between them."],
                                            ["Interface sketches", "Desktop and mobile wireframes that stay editable on the canvas."],
                                        ].map(([title, description], index) => (
                                            <div key={title} className="glass-panel-soft flex gap-3 p-3.5">
                                                <span className="mono-label mt-0.5 text-[#151714]/60">0{index + 1}</span>
                                                <div>
                                                    <div className="text-[12px] font-semibold text-[#151714]">{title}</div>
                                                    <div className="mt-1 text-[11px] leading-relaxed text-[#6c726d]">{description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </SidebarGroup>

                {projects.length > 0 && (
                    <SidebarGroup className="mt-6 p-0">
                        <div className="flex items-center justify-between px-2">
                            <SidebarGroupLabel className="mono-label h-auto p-0 text-[#6c726d]/65">
                                Recent
                            </SidebarGroupLabel>
                            <span className="mono-label rounded-full border border-[#151714]/7 bg-white/30 px-2 py-0.5 text-[#6c726d]/45">
                                {projects.length}
                            </span>
                        </div>
                        <div className="no-scrollbar mt-2 max-h-56 space-y-1 overflow-y-auto">
                            {projects.slice(0, 6).map((proj) => (
                                <Link
                                    key={proj.projectId}
                                    href={`/workspace/${proj.projectId}`}
                                    className="block"
                                >
                                    <SidebarMenuButton
                                        className="glass-nav-item h-9 cursor-pointer px-2.5"
                                        isActive={path === `/workspace/${proj.projectId}`}
                                    >
                                        <Folder size={14} className="shrink-0 opacity-55" />
                                        <span className="truncate text-[11.5px] font-medium">{proj.projectName}</span>
                                    </SidebarMenuButton>
                                </Link>
                            ))}
                        </div>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="gap-2 border-t border-[#151714]/7 p-3">
                <div className="glass-panel-soft p-3.5">
                    <div className="flex items-center justify-between">
                        <span className="mono-label text-[#6c726d]/70">Free plan</span>
                        <span className="mono-label text-[#6c726d]/45">
                            {boardCount}/{maxFreeBoards}
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                        <span className="text-[12.5px] font-semibold tracking-[-0.02em] text-[#151714]">
                            {maxFreeBoards - boardCount} boards left
                        </span>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-0.5 text-[10.5px] font-semibold text-[#151714] transition-colors hover:text-black"
                        >
                            View <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <Progress value={progressValue} className="mt-3 h-1.5" />
                </div>

                <div className="glass-panel-soft mt-0.5 flex items-center gap-2.5 rounded-[14px] px-2.5 py-2">
                    <UserButton />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-semibold leading-none text-[#151714]">
                            {user?.fullName || "User"}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-[#6c726d]/75">
                            {user?.primaryEmailAddress?.emailAddress}
                        </p>
                    </div>
                    <span className="size-1.5 rounded-full bg-[#151714]/40" />
                </div>

                <div className="mt-1 flex items-center justify-between px-0.5">
                    <a
                        href={SOCIAL_LINKS.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Follow on LinkedIn"
                        aria-label="Follow on LinkedIn"
                        className="group inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-[10.5px] font-semibold text-[#6c726d] transition-[color,transform] duration-150 hover:text-[#151714] active:scale-[0.97]"
                    >
                        <Linkedin size={13} className="text-[#151714]" />
                        <span>Follow us</span>
                        <ArrowUpRight
                            size={10}
                            className="text-[#6c726d]/45 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-[#151714]"
                        />
                    </a>

                    <div className="flex items-center gap-1">
                        <a
                            href={SOCIAL_LINKS.discord}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Join the Discord"
                            aria-label="Join the Discord"
                            className="flex size-10 items-center justify-center rounded-full border border-[#151714]/8 bg-white/32 text-[#6c726d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-px hover:border-[#151714]/12 hover:bg-white/55 hover:text-[#151714] active:translate-y-0 active:scale-[0.92]"
                        >
                            <Discord size={15} />
                        </a>
                        <a
                            href={SOCIAL_LINKS.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on GitHub"
                            aria-label="View on GitHub"
                            className="flex size-10 items-center justify-center rounded-full border border-[#151714]/8 bg-white/32 text-[#6c726d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-px hover:border-[#151714]/12 hover:bg-white/55 hover:text-[#151714] active:translate-y-0 active:scale-[0.92]"
                        >
                            <Github size={15} />
                        </a>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
