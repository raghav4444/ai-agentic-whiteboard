"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { colorForIdentity, initialsForName } from "@/lib/collab/merge";
import type { CollabSession } from "./useCollabSession";

const connectionCopy = {
  connecting: { label: "Joining", dot: "bg-[#b07b22]", text: "text-[#7a5a1e]" },
  live: { label: "Live", dot: "bg-[#2aab70]", text: "text-[#065f46]" },
  reconnecting: { label: "Reconnecting", dot: "bg-[#b07b22] animate-pulse", text: "text-[#7a5a1e]" },
  offline: { label: "Offline", dot: "bg-[#9a4335]", text: "text-[#7d3427]" },
} as const;

function Avatar({
  name,
  identityId,
  size = "md",
}: {
  name: string;
  identityId: string;
  size?: "sm" | "md";
}) {
  const palette = colorForIdentity(identityId || name);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full border font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${
        size === "sm" ? "size-6 text-[9px]" : "size-7 text-[9.5px]"
      }`}
      style={{
        backgroundColor: palette.background,
        color: palette.stroke,
        borderColor: `${palette.stroke}30`,
      }}
    >
      {initialsForName(name)}
    </span>
  );
}

export default function PresenceBar({ session }: { session: CollabSession }) {
  const status = connectionCopy[session.connection];
  const participants = session.participants;
  const visible = participants.slice(0, 4);
  const overflow = Math.max(0, participants.length - visible.length);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className={`glass-chip h-7 gap-1.5 px-2.5 text-[10px] font-semibold ${status.text}`}
        title={`${participants.length} ${
          participants.length === 1 ? "person" : "people"
        } on this board`}
      >
        <span className={`size-1.5 rounded-full ${status.dot}`} />
        <span className="hidden sm:inline">{status.label}</span>
        <span className="tabular-nums sm:hidden">{participants.length || 1}</span>
      </span>

      {participants.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Show ${participants.length} people on this board`}
              className="flex cursor-pointer items-center rounded-full p-0.5 transition-transform active:scale-[0.96] focus-visible:ring-3 focus-visible:ring-[#2aab70]/25"
            >
              <span className="flex -space-x-1.5">
                {visible.map((participant) => (
                  <span
                    key={participant.clientId}
                    className="rounded-full ring-2 ring-[#fffdf7]"
                    title={participant.name}
                  >
                    <Avatar
                      name={participant.name}
                      identityId={participant.identityId || participant.clientId}
                    />
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#151714] text-[9px] font-semibold text-[#faf9f6] ring-2 ring-[#fffdf7]">
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 gap-0 p-2.5">
            <div className="flex items-center justify-between px-1.5 pb-2">
              <span className="text-[11.5px] font-semibold text-[#151714]">On this board</span>
              <span className="text-[10px] font-medium text-[#6c726d]">
                {participants.length} online
              </span>
            </div>
            <div className="my-1 h-px bg-[#151714]/10 dark:bg-white/10" />
            <div className="flex flex-col gap-0.5 pt-1">
              {participants.map((participant) => {
                const isSelf = participant.clientId === session.clientId;
                return (
                  <div
                    key={participant.clientId}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#151714]/5 dark:hover:bg-white/5"
                  >
                    <Avatar
                      name={participant.name}
                      identityId={participant.identityId || participant.clientId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-semibold text-[#151714] dark:text-[#f4f2ea]">
                        {participant.name}
                        {isSelf ? " (you)" : ""}
                      </p>
                      <p className="text-[10px] text-[#6c726d]">
                        {isSelf ? "This tab" : "Editing now"}
                      </p>
                    </div>
                    <span className="size-1.5 rounded-full bg-[#2aab70]" />
                  </div>
                );
              })}
            </div>
            {participants.length === 1 && (
              <p className="px-2 pt-2 text-[10.5px] leading-relaxed text-[#6c726d]">
                Share the link to bring someone else onto the canvas.
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
