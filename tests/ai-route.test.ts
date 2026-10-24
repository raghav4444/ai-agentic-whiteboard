import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(async () => ({ id: "test-user" })),
}))

const diagramPayload = {
  title: "Auth flow",
  diagramType: "Flowchart",
  summary: "A short sign-in flow.",
  nodes: [
    { id: "start", label: "Sign in", type: "ellipse", column: 0, row: 0 },
    { id: "check", label: "Valid credentials?", type: "diamond", column: 1, row: 0 },
    { id: "board", label: "Dashboard", type: "rectangle", column: 2, row: 0 },
  ],
  connections: [
    { from: "start", to: "check" },
    { from: "check", to: "board", label: "yes" },
  ],
}

function geminiResponse(payload: unknown = diagramPayload): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ text: JSON.stringify(payload) }],
          },
        },
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  )
}

async function callRoute(body: Record<string, unknown>): Promise<Response> {
  const { POST } = await import("@/app/api/ai/route")
  return POST(
    new NextRequest("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key")
    vi.stubEnv("GEMINI_MODEL", "")
    vi.stubGlobal("fetch", vi.fn(async () => geminiResponse()))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("compiles model JSON into canvas elements", async () => {
    const response = await callRoute({
      userInput: "Show the sign-in flow",
      type: "Auto",
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.diagramType).toBe("Flowchart")
    expect(data.title).toBe("Auth flow")
    expect(data.elements.length).toBeGreaterThan(0)
    expect(data.elements.some((element: { type: string }) => element.type === "arrow")).toBe(true)
    expect(data.summary).toContain("sign-in flow")
  })

  it("returns a clear configuration error instead of canned diagrams", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")

    const response = await callRoute({ userInput: "Draw anything" })
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toMatch(/not configured/i)
    expect(data.detail).toMatch(/GEMINI_API_KEY/)
  })

  it("returns text actions without trying to compile a diagram", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: {
                    parts: [
                      {
                        text: "## Review\n\nThe board has a clear client-to-API flow.",
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    )

    const response = await callRoute({
      userInput: "Review this board",
      action: "explain",
      context: [{ type: "text", text: "Web client" }],
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toContain("clear client-to-API flow")
    expect(data.elements).toBeUndefined()
  })

  it("reports an unusable model response without silently faking a diagram", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: { parts: [{ text: "I can't turn that into a diagram." }] },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    )

    const response = await callRoute({ userInput: "Draw a flow" })
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toMatch(/unusable diagram/i)
  })

  it("falls back to another model when the first is busy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(geminiResponse())
    vi.stubGlobal("fetch", fetchMock)

    const response = await callRoute({ userInput: "Draw a flow" })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(data.model).toBe("gemini-3.5-flash-lite")
  })
})
