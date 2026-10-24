"use client";
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button'
import { Save, Share, ArrowLeft, Loader2, CheckCircle2 } from '@/lib/icons'
import { toast } from '@/components/ui/toast'
import axios from 'axios'

type Props = {
    selectedTab: (value: "whiteboard" | "smartdoc") => void;
    activeTab?: "whiteboard" | "smartdoc";
}

function WorkspaceHeader({ selectedTab, activeTab = "whiteboard" }: Props) {
    const { projectid } = useParams();
    const [projectName, setProjectName] = useState("Untitled board");
    const [isSaving, setIsSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        if (!projectid) return;
        const fetchProjectDetails = async () => {
            try {
                const res = await axios.get(`/api/projects?projectId=${projectid}`);
                if (res.data?.projectName) {
                    setProjectName(res.data.projectName);
                }
            } catch (e) {
                console.error("Could not fetch project details:", e);
            }
        };
        fetchProjectDetails();
    }, [projectid]);

    const handleSave = () => {
        setIsSaving(true);
        window.dispatchEvent(new CustomEvent("whiteboard:save-request"));
        setTimeout(() => {
            setIsSaving(false);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 1600);
        }, 600);
    };

    const handleShare = async () => {
        try {
            if (typeof window !== "undefined") {
                await navigator.clipboard.writeText(window.location.href);
                toast.add({
                    type: "success",
                    title: "Link copied",
                    description: "The workspace URL is on your clipboard.",
                });
            }
        } catch (err) {
            console.error(err);
            toast.add({
                type: "error",
                title: "Copy failed",
                description: "Could not copy the URL to the clipboard.",
            });
        }
    };

    return (
        <header className="relative z-40 px-3 pt-3 sm:px-4 sm:pt-4">
            <div
                data-glass-reactive
                className="glass-toolbar relative flex min-h-[3.75rem] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:h-[3.75rem] sm:flex-nowrap sm:px-3.5 sm:py-0"
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Link
                        href="/dashboard"
                        aria-label="Back to dashboard"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#6c726d] transition-colors hover:bg-[#151714]/6 hover:text-[#151714] active:scale-[0.96] sm:size-9"
                    >
                        <ArrowLeft size={16} />
                    </Link>

                    <span className="hidden h-5 w-px bg-[#151714]/10 sm:block" />

                    <span className="hidden size-9 shrink-0 items-center justify-center rounded-[11px] border border-white/80 bg-[rgba(255,252,245,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:flex">
                        <Image src="/logo.svg" alt="ScribeBoard" width={20} height={20} />
                    </span>

                    <div className="min-w-0">
                        <span className="mono-label hidden text-[#6c726d]/55 sm:block">Canvas</span>
                        <h2 className="max-w-[8rem] truncate text-[13.5px] font-semibold leading-tight tracking-[-0.03em] text-[#151714] sm:max-w-[15rem] md:max-w-xs">
                            {projectName}
                        </h2>
                    </div>
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
                    {justSaved && (
                        <span className="hidden sm:inline-flex">
                            <span className="glass-chip h-7 gap-1.5 px-2.5 text-[10px] font-semibold text-[#065f46]">
                                <CheckCircle2 size={12} />
                                Saved
                            </span>
                        </span>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-11 w-11 gap-1.5 px-0 text-[11.5px] sm:h-9 sm:w-auto sm:px-3.5"
                    >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        <span className="hidden sm:inline">Save</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShare}
                        className="h-11 w-11 gap-1.5 px-0 text-[11.5px] sm:h-9 sm:w-auto sm:px-3.5"
                    >
                        <Share size={13} />
                        <span className="hidden sm:inline">Share</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}

export default WorkspaceHeader;
