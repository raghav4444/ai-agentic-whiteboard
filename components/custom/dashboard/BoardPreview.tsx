"use client";

import { useEffect, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { LayoutGrid, Loader2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

type PreviewPayload = {
  elements?: ExcalidrawElement[];
  appState?: Record<string, unknown>;
  files?: BinaryFiles;
};

type PreviewStatus = "loading" | "ready" | "empty" | "error";

type BoardPreviewProps = {
  projectId: string;
  projectName: string;
  className?: string;
};

/**
 * A real, read-only canvas thumbnail. The preview endpoint is owner-only, so
 * this renders the stored Excalidraw scene rather than a decorative mock.
 */
export default function BoardPreview({
  projectId,
  projectName,
  className,
}: BoardPreviewProps) {
  const svgHostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PreviewStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();
    const host = svgHostRef.current;
    let cancelled = false;

    async function renderPreview() {
      try {
        const response = await fetch(
          `/api/projects/preview?projectId=${encodeURIComponent(projectId)}`,
          { signal: controller.signal, cache: "no-store" }
        );

        if (!response.ok) throw new Error("Preview request failed");
        const payload = (await response.json()) as PreviewPayload;
        if (cancelled) return;

        const elements = Array.isArray(payload.elements)
          ? payload.elements.filter((element) => !element.isDeleted)
          : [];

        if (elements.length === 0) {
          setStatus("empty");
          return;
        }

        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const storedState = payload.appState || {};
        const viewBackgroundColor =
          typeof storedState.viewBackgroundColor === "string"
            ? storedState.viewBackgroundColor
            : "#fbf8f0";

        const svg = await exportToSvg({
          elements,
          appState: {
            ...(storedState as Partial<AppState>),
            viewBackgroundColor,
            exportBackground: true,
            exportWithDarkMode: false,
          },
          files: payload.files || {},
        });

        if (cancelled) return;
        const host = svgHostRef.current;
        if (!host) return;

        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("aria-hidden", "true");
        svg.style.display = "block";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.maxWidth = "100%";
        svg.style.maxHeight = "100%";
        host.replaceChildren(svg);
        setStatus("ready");
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setStatus("error");
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
      controller.abort();
      host?.replaceChildren();
    };
  }, [projectId]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[#fbf8f0]",
        className
      )}
      role="img"
      aria-label={`Preview of ${projectName}`}
      aria-busy={status === "loading"}
    >
      <div
        ref={svgHostRef}
        className="pointer-events-none absolute inset-0 [&>svg]:h-full [&>svg]:w-full"
      />

      {status === "ready" ? null : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.92),rgba(251,248,240,0.88))] text-center">
          {status === "loading" ? (
            <>
              <Loader2 size={17} className="animate-spin text-[#2aab70]/75" />
              <span className="mono-label text-[#6c726d]/55">Loading canvas</span>
            </>
          ) : (
            <>
              <span className="flex size-9 items-center justify-center rounded-full border border-[#151714]/8 bg-white/65 text-[#6c726d]/70">
                <LayoutGrid size={15} />
              </span>
              <span className="mono-label px-3 text-[#6c726d]/55">
                {status === "empty"
                  ? "Blank canvas"
                  : "Preview unavailable"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
