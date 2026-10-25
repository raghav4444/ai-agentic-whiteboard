"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Share,
} from "@/lib/icons";
import { colorForIdentity, initialsForName } from "@/lib/collab/merge";
import type { CollabSession } from "./useCollabSession";
import type { SharePermission } from "@/lib/collab/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CollabSession;
  projectId: string;
  isShared?: boolean;
};

function PersonRow({
  name,
  identityId,
  detail,
  self,
}: {
  name: string;
  identityId: string;
  detail: string;
  self?: boolean;
}) {
  const palette = colorForIdentity(identityId || name);
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-2">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        style={{
          backgroundColor: palette.background,
          color: palette.stroke,
          borderColor: `${palette.stroke}30`,
        }}
      >
        {initialsForName(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[#151714]">
          {name}
          {self ? " · you" : ""}
        </p>
        <p className="text-[10.5px] text-[#6c726d]">{detail}</p>
      </div>
      {!self && <span className="size-1.5 rounded-full bg-[#2aab70]" />}
    </div>
  );
}

export default function ShareDialog({
  open,
  onOpenChange,
  session,
  projectId,
  isShared = false,
}: Props) {
  const canManage = session.role === "owner" && !isShared;
  const [permission, setPermission] = useState<SharePermission>(
    session.role === "viewer" ? "view" : "edit"
  );
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    if (!open || !canManage) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, permission }),
        });
        const data = (await response.json().catch(() => null)) as {
          url?: string;
          error?: string;
          detail?: string;
        } | null;

        if (cancelled) return;

        if (!response.ok || !data?.url) {
          setLink("");
          setError(
            data?.detail ||
              data?.error ||
              "Could not create a share link right now."
          );
          return;
        }

        setLink(data.url);
      } catch {
        if (!cancelled) {
          setError(
            "Could not reach the sharing service. Your canvas is still saved."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManage, open, permission, projectId]);

  const displayedLink = canManage ? link : currentUrl;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setCopied(false);
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const changePermission = useCallback((next: SharePermission) => {
    setPermission(next);
    setError(null);
  }, []);

  const copyLink = useCallback(async () => {
    if (!displayedLink) return;
    try {
      await navigator.clipboard.writeText(displayedLink);
      setCopied(true);
      toast.add({
        type: "success",
        title: "Invite link copied",
        description: "Anyone with this link can join the board.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Copy failed",
        description: "Select the link and copy it manually.",
      });
    }
  }, [displayedLink]);

  const shareNative = useCallback(async () => {
    if (!displayedLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: session.projectName,
          text: "Join me on this ScribeBoard canvas",
          url: displayedLink,
        });
        return;
      } catch {
        // Falling back to copy is the least surprising outcome.
      }
    }
    await copyLink();
  }, [copyLink, displayedLink, session.projectName]);

  const permissionLabel =
    permission === "view" ? "Can view" : "Can edit";
  const helper =
    permission === "view"
      ? "They can inspect the canvas and follow live changes, but cannot draw."
      : "They can draw, generate with AI, and edit SmartDoc beside you.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-[490px] sm:p-6">
        <DialogHeader className="gap-2 pr-8">
          <span className="mono-label text-[#2aab70]">Live collaboration</span>
          <DialogTitle className="text-[24px] leading-[1.05] tracking-[-0.045em] text-[#151714]">
            Share this canvas
          </DialogTitle>
          <DialogDescription className="text-[11.5px] leading-relaxed text-[#6c726d]">
            {canManage
              ? "Bring teammates onto the board. Their cursors, selections and edits appear live."
              : "You are collaborating through a shared link. Copy it to invite someone else."}
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <div className="space-y-2">
            <p className="mono-label text-[#6c726d]/55">Anyone with the link</p>
            <div className="glass-segmented grid grid-cols-2 gap-1 p-1">
              <button
                type="button"
                aria-pressed={permission === "edit"}
                onClick={() => changePermission("edit")}
                className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11.5px] font-semibold transition-[background-color,color,box-shadow,transform] active:scale-[0.98] ${
                  permission === "edit"
                    ? "bg-[#151714] text-[#faf9f6] shadow-[0_8px_18px_-12px_rgba(21,23,20,0.8)]"
                    : "text-[#6c726d] hover:text-[#151714]"
                }`}
              >
                <Pencil size={12} />
                Can edit
              </button>
              <button
                type="button"
                aria-pressed={permission === "view"}
                onClick={() => changePermission("view")}
                className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11.5px] font-semibold transition-[background-color,color,box-shadow,transform] active:scale-[0.98] ${
                  permission === "view"
                    ? "bg-[#151714] text-[#faf9f6] shadow-[0_8px_18px_-12px_rgba(21,23,20,0.8)]"
                    : "text-[#6c726d] hover:text-[#151714]"
                }`}
              >
                <Lock size={12} />
                Can view
              </button>
            </div>
            <p className="px-1 text-[10.5px] leading-relaxed text-[#6c726d]/80">
              {helper}
            </p>
          </div>
        )}

        {!canManage && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#151714]/8 bg-[rgba(255,252,245,0.55)] px-3.5 py-3">
            <span className="flex size-8 items-center justify-center rounded-full border border-[#2aab70]/20 bg-[#2aab70]/9 text-[#065f46]">
              {session.role === "viewer" ? (
                <Lock size={14} />
              ) : (
                <Pencil size={14} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-[#151714]">
                {session.role === "viewer" ? "View-only link" : "Editor access"}
              </p>
              <p className="text-[10.5px] leading-relaxed text-[#6c726d]">
                {session.role === "viewer"
                  ? "The owner has restricted this link to viewing."
                  : "Changes sync automatically for everyone on this link."}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Link2 size={12} className="text-[#2aab70]" />
            <span className="mono-label text-[#6c726d]/55">Invite link</span>
            {loading && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#6c726d]">
                <Loader2 size={10} className="animate-spin" /> Creating
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Globe
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6c726d]/50"
              />
              <Input
                readOnly
                value={displayedLink || (loading ? "Creating a secure link…" : "")}
                aria-label="Share link"
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 pl-8.5 font-mono text-[10.5px] text-[#3c423d]"
              />
            </div>
            <Button
              type="button"
              onClick={() => void copyLink()}
              disabled={!displayedLink || loading}
              className="h-10 shrink-0 gap-1.5 px-3.5 text-[11px]"
            >
              {copied ? (
                <Check size={13} className="text-[#a7e8c8]" />
              ) : (
                <Copy size={13} />
              )}
              <span className="hidden sm:inline">
                {copied ? "Copied" : "Copy"}
              </span>
            </Button>
          </div>
          {error && (
            <p className="rounded-xl border border-[#9a4335]/15 bg-[#9a4335]/5 px-3 py-2 text-[10.5px] leading-relaxed text-[#7d3427]">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void shareNative()}
            disabled={!displayedLink}
            className="h-9 flex-1 gap-1.5 text-[11px]"
          >
            <Share size={13} />
            Share invite
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (displayedLink) window.open(displayedLink, "_blank", "noopener,noreferrer");
            }}
            disabled={!displayedLink}
            className="h-9 flex-1 gap-1.5 text-[11px]"
          >
            <ExternalLink size={13} />
            Open link
          </Button>
        </div>

        {session.isGuest && (
          <div className="space-y-2 rounded-2xl border border-[#151714]/8 bg-[rgba(255,252,245,0.55)] p-3.5">
            <label
              htmlFor="guest-display-name"
              className="mono-label text-[#6c726d]/55"
            >
              Your display name
            </label>
            <Input
              id="guest-display-name"
              value={session.guestName}
              maxLength={32}
              onChange={(event) => session.setGuestName(event.target.value)}
              placeholder="How teammates see you"
              className="h-9 text-[12px]"
            />
            <p className="text-[10px] leading-relaxed text-[#6c726d]/75">
              Everyone sees this beside your cursor. No account needed.
            </p>
          </div>
        )}

        <div className="border-t border-[#151714]/8 pt-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="mono-label text-[#6c726d]/55">On this board</p>
            <span className="text-[10px] font-semibold tabular-nums text-[#2aab70]">
              {session.participants.length} online
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {session.participants.length === 0 && (
              <p className="px-1.5 py-3 text-[10.5px] leading-relaxed text-[#6c726d]">
                Waiting for presence. Your own cursor appears here as soon as
                the live connection opens.
              </p>
            )}
            {session.participants.map((participant) => (
              <PersonRow
                key={participant.clientId}
                name={participant.name}
                identityId={participant.identityId || participant.clientId}
                detail={
                  participant.clientId === session.clientId
                    ? "This tab"
                    : "Live on the canvas"
                }
                self={participant.clientId === session.clientId}
              />
            ))}
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[#6c726d]/65">
          <Lock size={11} className="mt-0.5 shrink-0" />
          <span>
            Share links are signed. Anyone with the link gets{" "}
            {permissionLabel.toLowerCase()} access, so only share it with people
            you trust.
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
