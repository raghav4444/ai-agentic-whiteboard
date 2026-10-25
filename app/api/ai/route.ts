import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  compileDiagramFromUnknown,
  DiagramSpecError,
} from "@/lib/ai/diagram";
import { verifyShareToken } from "@/lib/collab/token";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL?.trim(),
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ].filter((model): model is string => Boolean(model))
  )
);

const MAX_INPUT_LENGTH = 2400;
const MODEL_TIMEOUT_MS = 34_000;

class AiProviderError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

type AiAction = "explain" | "summarize" | "brainstorm" | "smartdoc";

function isTextAction(action: string | undefined): action is AiAction {
  return (
    action === "explain" ||
    action === "summarize" ||
    action === "brainstorm" ||
    action === "smartdoc"
  );
}

function asText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function formatBoardContext(context: unknown): string {
  if (typeof context === "string") return context.trim().slice(0, 4000);
  if (!Array.isArray(context)) return "";

  const lines = context
    .slice(0, 60)
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const text = asText(
        record.text ?? record.label ?? record.name ?? record.title,
        180
      );
      if (!text) return "";
      const type = asText(record.type, 24) || "element";
      return `- ${type}: ${text}`;
    })
    .filter(Boolean);

  return lines.join("\n");
}

function generationSystemPrompt(
  mode: string,
  detailLevel: string
): string {
  const density =
    detailLevel === "enterprise"
      ? "Use 12-24 nodes when the subject genuinely needs that depth."
      : "Use 6-12 nodes and keep the visual focused.";
  const normalizedMode = mode.toLowerCase();
  const requestedMode =
    !mode || normalizedMode === "auto"
      ? "Infer the most useful visual form from the request. Do not assume software architecture."
      : `The user selected "${mode}". Honor that mode when it fits the request. If a different structure would communicate the idea far more clearly, choose the better structure and explain the choice in the summary.`;
  const modeSpecific =
    normalizedMode.includes("mobile")
      ? "For a mobile mockup, use a tall screen container and a restrained set of high-value controls. Arrange screens side by side when showing more than one state."
      : normalizedMode.includes("web") || normalizedMode.includes("mockup")
        ? "For a web or UI mockup, use large containers for page regions, rectangles for controls, and text nodes for headings and copy. Show hierarchy without drawing every navigation item."
        : normalizedMode.includes("flowchart")
          ? "For a flowchart, make every decision branch explicit and label the yes/no or condition paths."
          : "";

  return `You are a senior visual systems designer working inside a collaborative whiteboard.

FIRST understand what the user is actually trying to think through, then choose the visual structure that makes it clearest. The result can be a system architecture, flowchart, mind map, ERD, user journey, timeline, wireframe, comparison, concept map, swimlane, or another appropriate structure. Never force every request into a software architecture.

${requestedMode}
${modeSpecific}
${density}

Return ONLY a valid JSON object with this shape:
{
  "title": "Short, specific title",
  "diagramType": "Architecture | Flowchart | Mind map | ERD | Journey | Timeline | Wireframe | Comparison | Concept map | Sequence map | ...",
  "summary": "A concise plain-text explanation of the structure, the key relationships, and how to read it. Use short paragraphs; no markdown headings.",
  "notes": ["Optional assumption or design note"],
  "groups": [
    { "title": "Group label", "nodeIds": ["node_id"], "color": "sand" }
  ],
  "nodes": [
    {
      "id": "short_unique_id",
      "label": "Short node label",
      "sublabel": "Optional detail or key attributes",
      "type": "rectangle | diamond | ellipse | text | container",
      "color": "sage | green | amber | clay | slate | sand | cream | ink",
      "containerId": "optional_parent_container_id",
      "column": 0,
      "row": 0,
      "width": 220,
      "height": 92,
      "fontSize": 14,
      "strokeStyle": "solid | dashed | dotted",
      "opacity": 100
    }
  ],
  "connections": [
    {
      "from": "source_id",
      "to": "target_id",
      "label": "Relationship, protocol, or action",
      "style": "solid | dashed | dotted",
      "arrowhead": "arrow | triangle | bar | dot | none",
      "bidirectional": false
    }
  ]
}

LAYOUT RULES:
- Use columns for left-to-right position and rows for top-to-bottom position. Give every top-level node an explicit column and row.
- Keep the diagram within 8 columns and 16 rows. Leave enough space for large containers.
- Children of a container only need their array order or row values to control vertical order inside that container; global columns and rows are ignored for them.
- Containers are backgrounds for panels, screens, or swimlanes. Set containerId on child nodes to stack them inside the container; the compiler handles vertical placement and expands the container when needed. Nodes without containerId sit on the global grid.
- For wireframes, use one container per screen and assign that screen's controls and copy to it with containerId. Keep children in reading order and do not give them global columns or rows. Give large screen containers explicit widths and heights.
- For architecture panels, place services inside a container with containerId when they belong to that boundary; leave cross-boundary nodes on the global grid.
- For ERDs, put entity attributes in sublabels and cardinality in connection labels.
- For flowcharts, use diamond nodes for decisions and label each outgoing branch.
- For mind maps, put the central idea in column 0 and branch outward.
- For timelines, use columns as phases and connections to show progression.

QUALITY RULES:
- Every node must participate in a meaningful connection. No orphan decoration.
- Use 1-24 nodes, 1-34 connections, and no more than 14 groups.
- Keep labels short enough to fit. Put detail in sublabels.
- Keep each group's members contiguous on the grid. A group must never enclose nodes that belong to another group; give each group its own column or row band. If two members would sit diagonally across another group, move them into the same band or leave them ungrouped.
- When two nodes share a direct connection, place them in the same row or column whenever possible. Avoid a long diagonal connection that skips over intervening nodes.
- Combine multiple relationships between the same pair of nodes into one connection with a concise combined label instead of drawing separate parallel arrows.
- Use color semantically and sparingly. This is an editorial, warm-paper product, not a rainbow dashboard.
- Do not invent a relationship that the user did not imply.
- The summary should explain the thinking, not just list the nodes.
- Output valid JSON only. No markdown code fences, commentary, or trailing text.`;
}

function textSystemPrompt(action: AiAction): string {
  if (action === "explain" || action === "summarize") {
    return `You are a principal architect and visual reviewer.
Analyze the supplied whiteboard context in useful depth. Produce a structured markdown response covering:
1. Executive summary
2. Structural pattern and topology
3. Data flow and communication relationships
4. Gaps, risks, and bottlenecks
5. Specific next steps
Be concrete and reference the labels you were given. Do not invent components that are not present.`;
  }

  if (action === "smartdoc") {
    return `You are an elite technical specification writer.
Write professional, implementation-ready documentation based on the request. Include, when relevant:
- Overview and goals
- Component responsibilities
- APIs, data contracts, and protocols
- Non-functional requirements (scale, reliability, security)
- Phased implementation plan
Use clear markdown headings and concise bullet points.`;
  }

  return `You are a chief product strategist and creative visual thinker.
Generate 6-8 genuinely different directions for the request. For each direction include:
- Concept name
- The visual structure it would use
- Why it is valuable
- What the user would understand from it
Avoid repeating the same idea with different names.`;
}

function generationUserContent(
  userInput: string,
  context: unknown,
  canvasMode: unknown
): string {
  const parts = [userInput];
  const contextText = formatBoardContext(context);

  if (contextText) {
    parts.push(
      `Existing board context (labels only):\n${contextText}\n\nUse this context to extend or revise the current thinking instead of inventing an unrelated system.`
    );
  }

  if (canvasMode === "append") {
    parts.push(
      "The result will be appended to the existing board, so avoid duplicating what is already there."
    );
  }

  return parts.filter(Boolean).join("\n\n");
}

async function callGemini(args: {
  apiKey: string;
  systemInstruction: string;
  userContent: string;
  json: boolean;
}): Promise<{ text: string; model: string }> {
  let lastError: AiProviderError | null = null;

  for (const model of MODEL_CANDIDATES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": args.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: args.systemInstruction }],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      args.userContent ||
                      "Create the requested whiteboard output.",
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.25,
              topP: 0.9,
              maxOutputTokens: 8192,
              ...(args.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
          signal: controller.signal,
        }
      );

      const raw = await response.text();

      if (!response.ok) {
        console.error(
          `Gemini ${model} failed with ${response.status}: ${raw.slice(0, 500)}`
        );
        lastError = new AiProviderError(
          response.status === 429 || response.status === 503
            ? "The AI service is busy right now. Try again in a moment."
            : "The AI service could not complete the request.",
          response.status
        );
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403
        ) {
          break;
        }
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        lastError = new AiProviderError(
          "The AI service returned an unreadable response."
        );
        continue;
      }

      const payload = data as {
        error?: { message?: string };
        candidates?: Array<{
          finishReason?: string;
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };

      if (payload.error?.message) {
        console.error(`Gemini ${model} error:`, payload.error.message);
        lastError = new AiProviderError(
          "The AI service rejected the request."
        );
        continue;
      }

      const candidate = payload.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .filter((part) => part.thought !== true)
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();

      if (text) {
        return { text, model };
      }

      console.error(
        `Gemini ${model} returned no text (finishReason: ${candidate?.finishReason || "unknown"})`
      );
      lastError = new AiProviderError(
        candidate?.finishReason === "SAFETY" ||
          candidate?.finishReason === "BLOCKED"
          ? "The AI declined to generate this request."
          : "The AI returned an empty response."
      );
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError");
      console.error(`Gemini ${model} request error:`, error);
      lastError = new AiProviderError(
        aborted
          ? "The AI took too long to respond. Try a simpler request."
          : "The AI service is unreachable right now."
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ||
    new AiProviderError("No AI model is currently available.", 503)
  );
}

function extractJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to a tolerant object/array extraction. Models occasionally
    // add one sentence before the JSON even when instructed not to.
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    try {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    } catch {
      // The caller turns this into a friendly retry message.
    }
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
    } catch {
      // The caller turns this into a friendly retry message.
    }
  }

  throw new Error("The AI response was not valid JSON.");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const user = await currentUser();
    if (!user) {
      const shareToken =
        asText(body.shareToken, 2_400) ||
        req.headers.get("x-share-token") ||
        "";
      const share = verifyShareToken(shareToken);
      const requestProjectId = asText(body.projectId, 160);

      if (
        !share ||
        share.permission !== "edit" ||
        (requestProjectId && requestProjectId !== share.projectId)
      ) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            detail:
              "Sign in, or open this board through an edit-enabled share link.",
          },
          { status: 401 }
        );
      }
    }

    const userInput = asText(body.userInput, MAX_INPUT_LENGTH);
    const actionValue = asText(body.action, 24).toLowerCase();
    const action = isTextAction(actionValue) ? actionValue : undefined;
    const context = body.context;
    const contextText = formatBoardContext(context);

    if (!userInput && !(action && contextText)) {
      return NextResponse.json(
        { error: "Describe what you want to create or inspect." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI is not configured.",
          detail:
            "Add GEMINI_API_KEY to the environment. The assistant no longer falls back to canned diagrams.",
        },
        { status: 503 }
      );
    }

    const requestedMode = asText(body.type, 48);
    const detailLevel =
      asText(body.detailLevel, 24) === "enterprise" ? "enterprise" : "standard";

    let systemInstruction: string;
    let userContent: string;

    if (action) {
      systemInstruction = textSystemPrompt(action);
      userContent = [
        userInput || `Review the current board for a ${action} request.`,
        contextText ? `Whiteboard context:\n${contextText}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else {
      systemInstruction = generationSystemPrompt(requestedMode, detailLevel);
      userContent = generationUserContent(
        userInput,
        context,
        body.canvasMode
      );
    }

    const generated = await callGemini({
      apiKey,
      systemInstruction,
      userContent,
      json: !action,
    });

    if (action) {
      return NextResponse.json({
        response: generated.text,
        model: generated.model,
      });
    }

    let parsed: unknown;
    try {
      parsed = extractJson(generated.text);
    } catch (error) {
      console.error("AI returned invalid JSON:", error, generated.text.slice(0, 800));
      return NextResponse.json(
        {
          error: "The AI returned an unusable diagram.",
          detail: "Try rephrasing the request with the main components and relationships.",
        },
        { status: 502 }
      );
    }

    try {
      const diagram = compileDiagramFromUnknown(parsed);
      return NextResponse.json({
        elements: diagram.elements,
        summary: diagram.summary,
        title: diagram.title,
        diagramType: diagram.diagramType,
        warnings: diagram.warnings,
        model: generated.model,
      });
    } catch (error) {
      if (error instanceof DiagramSpecError) {
        console.error("AI diagram validation failed:", error.message, generated.text.slice(0, 800));
        return NextResponse.json(
          {
            error: "The AI couldn't turn that into a diagram.",
            detail: error.message,
          },
          { status: 502 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("AI Route error:", error);
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      );
    }
    return NextResponse.json(
      { error: "The AI request failed. Please try again." },
      { status: 500 }
    );
  }
}
