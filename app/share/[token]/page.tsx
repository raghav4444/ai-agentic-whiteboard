import { notFound } from "next/navigation";
import type { Metadata } from "next";
import WorkspaceShell from "@/components/custom/workspace/WorkspaceShell";
import { verifyShareToken } from "@/lib/collab/token";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const share = verifyShareToken(token);
  if (!share) return { title: "Shared canvas | ScribeBoard" };
  return {
    title: `${share.projectName} · Shared canvas | ScribeBoard`,
    description: "A live ScribeBoard canvas shared with you.",
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const share = verifyShareToken(token);
  if (!share) notFound();

  return (
    <WorkspaceShell
      projectId={share.projectId}
      shareToken={token}
      initialProjectName={share.projectName}
      initialRole={share.permission === "view" ? "viewer" : "editor"}
      isShared
    />
  );
}
