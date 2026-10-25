"use client";

import { useParams } from "next/navigation";
import WorkspaceShell from "@/components/custom/workspace/WorkspaceShell";

export default function Workspace() {
  const params = useParams<{ projectid: string | string[] }>();
  const projectId = Array.isArray(params.projectid)
    ? params.projectid[0]
    : params.projectid;

  if (!projectId) return null;

  return <WorkspaceShell projectId={projectId} />;
}
