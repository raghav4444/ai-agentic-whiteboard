"use client";
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button'
import { Save, Share, ArrowLeft, Loader2, Lock, Download, FileText, Code2 } from '@/lib/icons'
import axios from 'axios'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PresenceBar from './PresenceBar'
import ShareDialog from './ShareDialog'
import type { CollabSession } from './useCollabSession'

type Props = {
    selectedTab: (value: "whiteboard" | "smartdoc") => void;
    activeTab?: "whiteboard" | "smartdoc";
    session: CollabSession;
    projectId: string;
    shareToken?: string;
    initialProjectName?: string;
    isShared?: boolean;
}

function WorkspaceHeader({
    selectedTab,
    activeTab = "whiteboard",
    session,
    projectId,
    initialProjectName,
    isShared = false,
}: Props) {
    const [fetchedProjectName, setFetchedProjectName] = useState("");
    const [shareOpen, setShareOpen] = useState(false);
    const [exporting, setExporting] = useState<
        "png" | "pdf" | "svg" | null
    >(null);

    useEffect(() => {
        const handleComplete = () => setExporting(null);
        window.addEventListener("whiteboard:export-complete", handleComplete);
        return () => {
            window.removeEventListener(
                "whiteboard:export-complete",
                handleComplete
            );
        };
    }, []);

    useEffect(() => {
        if (initialProjectName || !projectId || isShared) return;

        let cancelled = false;
        const fetchProjectDetails = async () => {
            try {
                const res = await axios.get(`/api/projects?projectId=${projectId}`);
                if (!cancelled && res.data?.projectName) {
                    setFetchedProjectName(res.data.projectName);
                }
            } catch (e) {
                console.error("Could not fetch project details:", e);
            }
        };
        fetchProjectDetails();
        return () => {
            cancelled = true;
        };
    }, [initialProjectName, isShared, projectId]);

    const projectName =
        initialProjectName ||
        fetchedProjectName ||
        (session.projectName !== "Untitled board" ? session.projectName : "") ||
        "Untitled board";

    const handleSave = () => {
        window.dispatchEvent(new CustomEvent("whiteboard:save-request"));
    };

    const requestExport = (format: "png" | "pdf" | "svg") => {
        if (exporting) return;
        const filename =
            projectName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") || "scribeboard-canvas";
        setExporting(format);
        window.dispatchEvent(
            new CustomEvent("whiteboard:export-request", {
                detail: { format, filename },
            })
        );
        // The canvas may not be mounted (or an export may fail before it
        // reports back). Never leave the button stuck in a loading state.
        window.setTimeout(() => {
            setExporting((current) => (current === format ? null : current));
        }, 20_000);
    };

    const isSaving = session.syncStatus === "saving";
    const readOnly = session.role === "viewer";

    return (
        <header className="relative z-40 px-3 pt-3 sm:px-4 sm:pt-4">
            <div
                data-glass-reactive
                className="glass-toolbar relative flex min-h-[3.75rem] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:h-[3.75rem] sm:flex-nowrap sm:px-3.5 sm:py-0"
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Link
                        href={isShared ? "/" : "/dashboard"}
                        aria-label={isShared ? "Back to ScribeBoard" : "Back to dashboard"}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#6c726d] transition-colors hover:bg-[#151714]/6 hover:text-[#151714] active:scale-[0.96] sm:size-9"
                    >
                        <ArrowLeft size={16} />
                    </Link>

                    <span className="hidden h-5 w-px bg-[#151714]/10 sm:block" />

                    <span className="hidden size-9 shrink-0 items-center justify-center rounded-[11px] border border-white/80 bg-[rgba(255,252,245,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:flex">
                        <Image src="/logo.svg" alt="ScribeBoard" width={20} height={20} />
                    </span>

                    <div className="min-w-0">
                        <span className="mono-label hidden items-center gap-1.5 text-[#6c726d]/55 sm:flex">
                            {isShared ? (
                                <>
                                    <span className="size-1 rounded-full bg-[#2aab70]" />
                                    Shared canvas
                                </>
                            ) : (
                                "Canvas"
                            )}
                        </span>
                        <h2 className="max-w-[7.5rem] truncate text-[13.5px] font-semibold leading-tight tracking-[-0.03em] text-[#151714] sm:max-w-[15rem] md:max-w-xs">
                            {projectName}
                        </h2>
                    </div>

                    {readOnly && (
                        <span className="glass-chip ml-1 hidden h-7 gap-1 px-2.5 text-[10px] font-semibold text-[#6c726d] lg:inline-flex">
                            <Lock size={11} />
                            View only
                        </span>
                    )}
                </div>

                <div className="order-3 flex w-full shrink-0 items-center justify-center sm:order-none sm:w-auto">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => selectedTab(value as "whiteboard" | "smartdoc")}
                    >
                        <TabsList className="h-10 w-full sm:h-9 sm:w-auto">
                            <TabsTrigger value="whiteboard" className="flex-1 px-3.5 text-[11.5px] sm:flex-none">Whiteboard</TabsTrigger>
                            <TabsTrigger value="smartdoc" className="flex-1 px-3.5 text-[11.5px] sm:flex-none">SmartDoc</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1.5 sm:flex-1">
                    <span className="hidden md:flex">
                        <PresenceBar session={session} />
                    </span>

                    {!readOnly && (
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-11 w-11 gap-1.5 px-0 text-[11.5px] sm:h-9 sm:w-auto sm:px-3.5"
                        >
                            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            <span className="hidden sm:inline">
                                {isSaving ? "Syncing" : "Save"}
                            </span>
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShareOpen(true)}
                        className="h-11 w-11 gap-1.5 px-0 text-[11.5px] sm:h-9 sm:w-auto sm:px-3.5"
                    >
                        <Share size={13} />
                        <span className="hidden sm:inline">
                            {readOnly
                                ? "Copy link"
                                : isShared
                                  ? "Invite"
                                  : "Share"}
                        </span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={Boolean(exporting)}
                                className="h-11 w-11 gap-1.5 px-0 text-[11.5px] sm:h-9 sm:w-auto sm:px-3.5"
                            >
                                {exporting ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Download size={13} />
                                )}
                                <span className="hidden sm:inline">
                                    {exporting ? "Exporting" : "Export"}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                                onClick={() => requestExport("png")}
                                className="cursor-pointer gap-2.5 py-2.5"
                            >
                                <Download size={14} className="text-[#2aab70]" />
                                <span>Export as PNG</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => requestExport("pdf")}
                                className="cursor-pointer gap-2.5 py-2.5"
                            >
                                <FileText size={14} className="text-[#2aab70]" />
                                <span>Export as PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => requestExport("svg")}
                                className="cursor-pointer gap-2.5 py-2.5"
                            >
                                <Code2 size={14} className="text-[#2aab70]" />
                                <span>Export as SVG</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <ShareDialog
                open={shareOpen}
                onOpenChange={setShareOpen}
                session={session}
                projectId={projectId}
                isShared={isShared}
            />
        </header>
    );
}

export default WorkspaceHeader;
