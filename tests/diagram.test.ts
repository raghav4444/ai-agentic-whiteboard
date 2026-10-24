import { describe, expect, it } from "vitest"
import {
  compileDiagramFromUnknown,
  DiagramSpecError,
  normalizeDiagramSpec,
} from "@/lib/ai/diagram"

const spec = {
  title: "AI board platform",
  diagramType: "Architecture",
  summary: "A small service map.",
  groups: [
    { title: "Clients", nodeIds: ["web", "mobile"], color: "green" },
    { title: "Services", nodeIds: ["api", "worker"], color: "sand" },
  ],
  nodes: [
    {
      id: "web",
      label: "Web app",
      sublabel: "Next.js",
      type: "rectangle",
      color: "blue",
      column: 0,
      row: 0,
    },
    {
      id: "mobile",
      label: "Mobile app",
      type: "rectangle",
      color: "blue",
      column: 0,
      row: 1,
    },
    {
      id: "api",
      label: "API",
      sublabel: "Auth + boards",
      type: "rectangle",
      color: "green",
      column: 1,
      row: 0,
    },
    {
      id: "worker",
      label: "Worker",
      sublabel: "AI jobs",
      type: "rectangle",
      color: "amber",
      column: 1,
      row: 1,
    },
  ],
  connections: [
    { from: "web", to: "api", label: "HTTPS" },
    { from: "mobile", to: "api", label: "HTTPS" },
    { from: "api", to: "worker", label: "queue" },
  ],
}

describe("diagram compiler", () => {
  it("normalizes aliases and resolves connection references", () => {
    const normalized = normalizeDiagramSpec(spec)

    expect(normalized.nodes).toHaveLength(4)
    expect(normalized.nodes[0].color).toBe("sage")
    expect(normalized.connections).toHaveLength(3)
    expect(normalized.groups).toHaveLength(2)
    expect(normalized.warnings).toEqual([])
  })

  it("compiles labels, groups, and arrows into one editable scene", () => {
    const diagram = compileDiagramFromUnknown(spec)

    expect(diagram.title).toBe("AI board platform")
    expect(diagram.elements.filter((element) => element.type === "arrow")).toHaveLength(3)
    expect(diagram.elements.filter((element) => element.type === "rectangle").length).toBeGreaterThan(4)

    const title = diagram.elements.find((element) => element.id === "diagram-title")
    expect(title?.text).toBe("AI board platform")

    const api = diagram.elements.find(
      (element) => element.type === "rectangle" && element.label?.text.startsWith("API")
    )
    expect(api?.label?.text).toContain("Auth + boards")

    const arrow = diagram.elements.find((element) => element.id === "edge-0")
    expect(arrow?.start).toEqual({ id: "node-0" })
    expect(arrow?.end).toEqual({ id: "node-2" })
    expect(arrow?.points).toBeDefined()
  })

  it("drops relationships that point at missing nodes but keeps the diagram", () => {
    const normalized = normalizeDiagramSpec({
      ...spec,
      connections: [...spec.connections, { from: "web", to: "missing" }],
    })

    expect(normalized.connections).toHaveLength(3)
    expect(normalized.warnings[0]).toMatch(/do not exist/i)
  })

  it("lays out unconnected nodes in stable rows instead of stacking them", () => {
    const diagram = compileDiagramFromUnknown({
      nodes: [
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
        { id: "three", label: "Three" },
      ],
      connections: [],
    })

    const rectangles = diagram.elements.filter((element) => element.type === "rectangle")
    const ys = rectangles.map((element) => element.y)
    expect(new Set(ys).size).toBeGreaterThan(1)
  })

  it("stacks grouped children inside their container screen", () => {
    const diagram = compileDiagramFromUnknown({
      nodes: [
        {
          id: "screen",
          label: "Welcome",
          type: "container",
          width: 300,
          height: 300,
          column: 0,
          row: 0,
        },
        {
          id: "cta",
          label: "Get started",
          type: "rectangle",
          width: 200,
          height: 60,
          column: 0,
          row: 2,
        },
      ],
      groups: [{ title: "Welcome screen", nodeIds: ["screen", "cta"] }],
      connections: [],
    })

    const container = diagram.elements.find((element) => element.id === "node-0")
    const child = diagram.elements.find((element) => element.id === "node-1")
    expect(container).toBeDefined()
    expect(child).toBeDefined()
    expect(child!.x).toBeGreaterThanOrEqual(container!.x)
    expect(child!.y).toBeGreaterThan(container!.y + 50)
    expect(child!.x + (child!.width || 0)).toBeLessThanOrEqual(
      container!.x + (container!.width || 0)
    )
    expect(child!.y + (child!.height || 0)).toBeLessThanOrEqual(
      container!.y + (container!.height || 0)
    )
  })

  it("merges duplicate connections between the same two nodes", () => {
    const normalized = normalizeDiagramSpec({
      nodes: [
        { id: "web", label: "Web", column: 0, row: 0 },
        { id: "api", label: "API", column: 1, row: 0 },
      ],
      connections: [
        { from: "web", to: "api", label: "HTTPS" },
        { from: "web", to: "api", label: "JSON" },
      ],
    })

    expect(normalized.connections).toHaveLength(1)
    expect(normalized.connections[0].label).toBe("HTTPS · JSON")
  })

  it("routes a long arrow around a node that blocks the straight line", () => {
    const diagram = compileDiagramFromUnknown({
      nodes: [
        { id: "source", label: "Source", column: 0, row: 0 },
        { id: "blocker", label: "Blocker", column: 1, row: 0 },
        { id: "target", label: "Target", column: 2, row: 0 },
      ],
      connections: [{ from: "source", to: "target" }],
    })

    const arrow = diagram.elements.find((element) => element.type === "arrow")
    expect(arrow?.points?.length).toBe(6)
    expect(arrow?.height || 0).toBeGreaterThan(60)
    const ys = (arrow?.points || []).map((point) => point[1])
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(60)
  })

  it("wraps standalone text nodes to their layout width", () => {
    const diagram = compileDiagramFromUnknown({
      nodes: [
        {
          id: "copy",
          label:
            "Track daily progress and stay motivated with quiet reminders.",
          type: "text",
          width: 140,
          fontSize: 14,
          column: 0,
          row: 0,
        },
      ],
      connections: [],
    })

    const text = diagram.elements.find((element) => element.id === "node-0")
    expect(text?.text).toContain("\n")
    expect(text?.text?.split("\n").every((line) => line.length <= 20)).toBe(true)
  })

  it("does not create arrow bindings that would duplicate text nodes", () => {
    const diagram = compileDiagramFromUnknown({
      nodes: [
        { id: "caption", label: "A label", type: "text", column: 0, row: 0 },
        { id: "box", label: "A box", type: "rectangle", column: 1, row: 0 },
      ],
      connections: [{ from: "caption", to: "box", label: "leads to" }],
    })

    const arrow = diagram.elements.find((element) => element.type === "arrow")
    expect(arrow?.start).toBeUndefined()
    expect(arrow?.end).toEqual({ id: "node-1" })
  })

  it("rejects output without nodes", () => {
    expect(() => normalizeDiagramSpec({ connections: [] })).toThrow(DiagramSpecError)
  })
})
