"use client"

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import axios from 'axios'
import { useRouter } from 'next/navigation'

interface Props {
    onBoardCreated?: () => void;
    buttonClassName?: string;
    buttonLabel?: string;
    buttonVariant?: "default" | "inverse" | "onDark" | "secondary";
}

function CreateNewBoardDialog({ onBoardCreated, buttonClassName, buttonLabel, buttonVariant = "default" }: Props) {
    const [workspaceName, setWorkspaceName] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState(false);
    const router = useRouter();

    const handleCreateBoard = async () => {
        if (workspaceName.trim() === "" || workspaceName.length > 50) {
            toast.add({
                type: 'error',
                title: 'Invalid workspace name',
                description: 'Please enter a name between 1 and 50 characters.'
            })
            return;
        }

        setLoading(true);
        try {
            const projectId = crypto.randomUUID();
            await axios.post("/api/projects", {
                projectName: workspaceName.trim(),
                projectId: projectId,
            });

            toast.add({
                type: 'success',
                title: 'Board created',
            });

            setDialog(false);
            setWorkspaceName("");
            if (onBoardCreated) {
                onBoardCreated();
            }
            router.push(`/workspace/${projectId}`);
        } catch (error) {
            console.error(error);
            toast.add({
                type: 'error',
                title: 'Creation failed',
                description: 'Could not create the board. Please check the database configuration.'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} className={buttonClassName ?? "w-full gap-2 sm:w-auto"}>
                    <Plus size={15} /> {buttonLabel ?? "New board"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <p className="mono-label text-[#2aab70]">New canvas</p>
                    <DialogTitle className="mt-2 text-[24px] leading-[1.05] tracking-[-0.045em]">
                        Give the idea<br />
                        <span className="font-editorial text-[#065f46]">a place to land.</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="py-1">
                    <label className="text-[11px] font-semibold text-[#6c726d]">
                        Board name
                    </label>
                    <Input
                        placeholder="e.g. Realtime collaboration architecture"
                        className="mt-2"
                        value={workspaceName}
                        autoFocus
                        maxLength={50}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateBoard();
                            }
                        }}
                    />
                    <p className="mt-2.5 text-[11px] leading-relaxed text-[#6c726d]/75">
                        You can rename it later. Every board starts with an infinite canvas, an AI assistant and SmartDoc.
                    </p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        disabled={workspaceName.trim() === "" || loading}
                        onClick={handleCreateBoard}
                        className="gap-1.5"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Create board
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CreateNewBoardDialog
