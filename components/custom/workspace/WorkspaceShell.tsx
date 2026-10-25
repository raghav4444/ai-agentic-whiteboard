"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import WorkspaceHeader from "@/components/custom/workspace/WorkspaceHeader";
import SmartDoc from "@/components/custom/workspace/SmartDoc";
import GlassEffects from "@/components/custom/glass/GlassEffects";
import { useCollabSession } from "@/components/custom/workspace/useCollabSession";
import type { CollabRole } from "@/lib/collab/types";

const Whiteboard = dynamic(
  () => import("@/components/custom/workspace/Whiteboard"),
  { ssr: false }
);

type TabType = "whiteboard" | "smartdoc";

type Props = {
  projectId: string;
  shareToken?: string;
  initialProjectName?: string;
  initialRole?: CollabRole;
  isShared?: boolean;
};

export default function WorkspaceShell({
  projectId,
  shareToken,
  initialProjectName,
  initialRole,
  isShared = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("whiteboard");
  const session = useCollabSession({
    projectId,
    shareToken,
    projectName: initialProjectName,
    initialRole,
  });
  const readOnly = session.role === "viewer";

  return (
    <div className="glass-app flex h-screen w-screen flex-col overflow-hidden">
      <WorkspaceHeader
        selectedTab={(value: TabType) => setActiveTab(value)}
        activeTab={activeTab}
        session={session}
        projectId={projectId}
        shareToken={shareToken}
        initialProjectName={initialProjectName}
        isShared={isShared}
      />

      <main className="relative flex-1 overflow-hidden px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] border border-[#151714]/10 bg-[#fbfaf6] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_34px_80px_-42px_rgba(21,23,20,0.5)]">
          <div className={`h-full w-full ${activeTab === "whiteboard" ? "block" : "hidden"}`}>
            <Whiteboard
              projectId={projectId}
              session={session}
              readOnly={readOnly}
            />
          </div>
          <div className={`h-full w-full ${activeTab === "smartdoc" ? "block" : "hidden"}`}>
            <SmartDoc session={session} readOnly={readOnly} />
          </div>
        </div>
      </main>

      <GlassEffects />
    </div>
  );
}
