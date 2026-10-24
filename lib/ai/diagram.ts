/**
 * Diagram specification + Excalidraw skeleton compiler.
 *
 * The model returns a small, domain-neutral graph. This module validates it,
 * lays it out on a column/row grid, and turns it into Excalidraw skeleton
 * elements with bound labels and bound arrows. Keeping this pure makes the
 * generation contract testable without booting a canvas.
 */

export type DiagramShape =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "text"
  | "container";

export type DiagramColor =
  | "sage"
  | "green"
  | "amber"
  | "clay"
  | "slate"
  | "sand"
  | "cream"
  | "ink";

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  type: DiagramShape;
  color: DiagramColor;
  column?: number;
  row?: number;
  width: number;
  height: number;
  fontSize: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  fillStyle: "solid" | "hachure" | "cross-hatch";
  opacity: number;
  /** Optional parent container. Children are stacked inside their container. */
  containerId?: string;
}

export interface DiagramConnection {
  from: string;
  to: string;
  label?: string;
  style: "solid" | "dashed" | "dotted";
  color?: DiagramColor;
  arrowhead: "arrow" | "triangle" | "bar" | "dot" | "none";
  bidirectional: boolean;
}

export interface DiagramGroup {
  title: string;
  nodeIds: string[];
  color: DiagramColor;
}

export interface DiagramSpec {
  title: string;
  diagramType: string;
  summary: string;
  notes: string[];
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  groups: DiagramGroup[];
  warnings: string[];
}

export interface DiagramElement {
  id?: string;
  type: "rectangle" | "diamond" | "ellipse" | "text" | "arrow";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  roundness?: { type: number } | null;
  points?: [number, number][];
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  label?: {
    text: string;
    fontSize?: number;
    fontFamily?: number;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    strokeColor?: string;
  };
  start?: { id: string };
  end?: { id: string };
  startArrowhead?: string | null;
  endArrowhead?: string | null;
}

export interface CompiledDiagram {
  elements: DiagramElement[];
  title: string;
  diagramType: string;
  summary: string;
  warnings: string[];
}

export class DiagramSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramSpecError";
  }
}

const PALETTES: Record<
  DiagramColor,
  { bg: string; stroke: string; text: string; sub: string }
> = {
  sage: { bg: "#e6f0e9", stroke: "#5f8f77", text: "#244b39", sub: "#547565" },
  green: { bg: "#e3f2e8", stroke: "#2aab70", text: "#14532d", sub: "#3f7a5e" },
  amber: { bg: "#fbf0d7", stroke: "#b9852e", text: "#5c420f", sub: "#8a6a2c" },
  clay: { bg: "#f6e8e1", stroke: "#b96a4e", text: "#6b3424", sub: "#8f5a47" },
  slate: { bg: "#edf0ee", stroke: "#6c7a71", text: "#2b332d", sub: "#5e6a63" },
  sand: { bg: "#f3eddf", stroke: "#b09a66", text: "#4f4328", sub: "#7d6d48" },
  cream: { bg: "#fcf6e8", stroke: "#c8a96c", text: "#5d4b24", sub: "#8b7343" },
  ink: { bg: "#e9eae7", stroke: "#4d554e", text: "#151714", sub: "#626a64" },
};

const COLOR_ALIASES: Record<string, DiagramColor> = {
  blue: "sage",
  cyan: "slate",
  indigo: "sage",
  purple: "sand",
  violet: "sand",
  orange: "amber",
  yellow: "cream",
  red: "clay",
  pink: "clay",
  gray: "slate",
  grey: "slate",
  black: "ink",
  white: "cream",
  neutral: "slate",
  teal: "green",
};

const SHAPE_ALIASES: Record<string, DiagramShape> = {
  box: "rectangle",
  card: "rectangle",
  service: "rectangle",
  database: "rectangle",
  db: "rectangle",
  store: "rectangle",
  server: "rectangle",
  decision: "diamond",
  condition: "diamond",
  question: "diamond",
  circle: "ellipse",
  oval: "ellipse",
  terminal: "ellipse",
  start: "ellipse",
  end: "ellipse",
  cloud: "ellipse",
  person: "ellipse",
  actor: "ellipse",
  note: "text",
  label: "text",
  heading: "text",
  title: "text",
  copy: "text",
  panel: "container",
  frame: "container",
  section: "container",
  column: "container",
};

const SHAPE_DEFAULTS: Record<
  DiagramShape,
  { width: number; height: number; fontSize: number }
> = {
  rectangle: { width: 220, height: 92, fontSize: 14 },
  diamond: { width: 190, height: 112, fontSize: 13 },
  ellipse: { width: 200, height: 94, fontSize: 13 },
  text: { width: 260, height: 36, fontSize: 14 },
  container: { width: 360, height: 220, fontSize: 14 },
};

const MAX_NODES = 40;
const MAX_CONNECTIONS = 56;
const COLUMN_GAP = 104;
const ROW_GAP = 58;
const COLUMN_MIN_WIDTH = 200;
const ROW_MIN_HEIGHT = 92;
const CONTAINER_SIDE_PADDING = 20;
const CONTAINER_TOP_PADDING = 72;
const CONTAINER_BOTTOM_PADDING = 24;
const CONTAINER_CHILD_GAP = 16;
const FONT_FAMILY = 2;
const EDGE_COLOR = "#6c726d";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function asIdentifier(value: unknown, maxLength: number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return asText(value, maxLength);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeRef(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeColor(value: unknown): DiagramColor {
  const key = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (key in PALETTES) return key as DiagramColor;
  return COLOR_ALIASES[key] || "sage";
}

function normalizeShape(value: unknown): DiagramShape {
  const key =
    typeof value === "string" ? value.toLowerCase().trim().replace(/\s+/g, "-") : "";
  if (key in SHAPE_DEFAULTS) return key as DiagramShape;
  return SHAPE_ALIASES[key] || "rectangle";
}

function normalizeStrokeStyle(
  value: unknown,
  fallback: "solid" | "dashed" | "dotted"
): "solid" | "dashed" | "dotted" {
  const key = typeof value === "string" ? value.toLowerCase().trim() : "";
  return key === "dashed" || key === "dotted" || key === "solid" ? key : fallback;
}

function normalizeFillStyle(
  value: unknown
): "solid" | "hachure" | "cross-hatch" {
  const key = typeof value === "string" ? value.toLowerCase().trim() : "";
  return key === "hachure" || key === "cross-hatch" ? key : "solid";
}

function normalizeArrowhead(
  value: unknown
): "arrow" | "triangle" | "bar" | "dot" | "none" {
  const key = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (key === "triangle" || key === "bar" || key === "dot" || key === "none") {
    return key;
  }
  return "arrow";
}

function estimateTextHeight(
  label: string,
  sublabel: string | undefined,
  width: number,
  fontSize: number,
  baseHeight: number,
  type: DiagramShape
): number {
  if (type === "container") return baseHeight;

  const text = [label, sublabel].filter(Boolean).join("\n");
  const charsPerLine = Math.max(
    8,
    Math.floor(Math.max(60, width - 30) / Math.max(5, fontSize * 0.56))
  );
  const lines = text.split("\n").reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  return Math.max(baseHeight, Math.ceil(lines * fontSize * 1.35 + 28));
}

function wrapText(text: string, maxChars: number): string {
  const limit = Math.max(8, maxChars);
  return text
    .split("\n")
    .flatMap((line) => {
      if (!line.trim()) return [""];
      const words = line.trim().split(/\s+/);
      const wrapped: string[] = [];
      let current = "";

      words.forEach((word) => {
        if (!current) {
          current = word;
          return;
        }
        if (current.length + 1 + word.length <= limit) {
          current += ` ${word}`;
          return;
        }
        wrapped.push(current);
        current = word;
      });
      if (current) wrapped.push(current);

      return wrapped.flatMap((segment) => {
        if (segment.length <= limit) return [segment];
        const chunks: string[] = [];
        for (let index = 0; index < segment.length; index += limit) {
          chunks.push(segment.slice(index, index + limit));
        }
        return chunks;
      });
    })
    .join("\n");
}

function wrapNodeText(node: DiagramNode): void {
  if (node.type !== "text") return;
  const maxChars = Math.max(
    8,
    Math.floor(node.width / Math.max(5, node.fontSize * 0.56))
  );
  node.label = wrapText(node.label, maxChars);
  if (node.sublabel) node.sublabel = wrapText(node.sublabel, maxChars);
  node.height = clamp(
    estimateTextHeight(
      node.label,
      node.sublabel,
      node.width,
      node.fontSize,
      node.height,
      node.type
    ),
    24,
    760
  );
}

function defaultTypeLabel(spec: { diagramType?: string }): string {
  return spec.diagramType?.trim() || "Diagram";
}

/**
 * Validate and normalize model output. This is intentionally forgiving about
 * shape/color names and connection references, but strict about having at
 * least one usable node.
 */
export function normalizeDiagramSpec(input: unknown): DiagramSpec {
  let root = input;
  if (Array.isArray(root)) root = { nodes: root };
  const object = asRecord(root);
  const nested = asRecord(object.diagram);
  const source = Object.keys(nested).length > 0 ? nested : object;

  const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
  if (rawNodes.length === 0) {
    throw new DiagramSpecError("The AI response did not contain any diagram nodes.");
  }

  const warnings: string[] = [];
  const usedIds = new Set<string>();
  const containerRefs = new Map<string, unknown>();
  const nodes: DiagramNode[] = [];

  rawNodes.slice(0, MAX_NODES).forEach((rawNode, index) => {
    const raw = asRecord(rawNode);
    const baseId =
      asIdentifier(raw.id ?? raw.key, 64) || `node_${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id.toLowerCase())) {
      id = `${baseId}_${suffix}`;
      suffix += 1;
    }
    usedIds.add(id.toLowerCase());

    const type = normalizeShape(raw.type ?? raw.shape);
    const defaults = SHAPE_DEFAULTS[type];
    const label =
      asText(raw.label ?? raw.title ?? raw.name, 140) || `Node ${index + 1}`;
    const sublabel = asText(
      raw.sublabel ?? raw.subtitle ?? raw.description ?? raw.detail,
      220
    );
    const width = clamp(
      asNumber(raw.width) ?? defaults.width,
      type === "text" ? 80 : 90,
      900
    );
    const fontSize = clamp(
      asNumber(raw.fontSize) ?? defaults.fontSize,
      9,
      28
    );
    const requestedHeight = clamp(
      asNumber(raw.height) ?? defaults.height,
      type === "text" ? 24 : 44,
      760
    );
    const height = clamp(
      estimateTextHeight(label, sublabel, width, fontSize, requestedHeight, type),
      type === "text" ? 24 : 44,
      760
    );
    const column = asNumber(raw.column);
    const row = asNumber(raw.row);

    const node: DiagramNode = {
      id,
      label,
      ...(sublabel ? { sublabel } : {}),
      type,
      color: normalizeColor(raw.color ?? raw.tone),
      ...(column !== undefined ? { column: clamp(column, 0, 12) } : {}),
      ...(row !== undefined ? { row: clamp(row, 0, 30) } : {}),
      width,
      height,
      fontSize,
      strokeStyle: normalizeStrokeStyle(raw.strokeStyle, "solid"),
      fillStyle: normalizeFillStyle(raw.fillStyle),
      opacity: clamp(asNumber(raw.opacity) ?? 100, 20, 100),
    };
    wrapNodeText(node);
    nodes.push(node);

    const containerRef = raw.containerId ?? raw.parentId ?? raw.parent;
    if (containerRef !== undefined) containerRefs.set(id, containerRef);
  });

  const referenceMap = new Map<string, string>();
  nodes.forEach((node) => {
    const keys = [
      node.id.toLowerCase(),
      normalizeRef(node.id),
      node.label.toLowerCase(),
      normalizeRef(node.label),
    ].filter(Boolean);
    keys.forEach((key) => {
      if (!referenceMap.has(key)) referenceMap.set(key, node.id);
    });
  });

  const resolveNode = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
      return undefined;
    }
    const raw = String(value).trim();
    if (!raw) return undefined;
    return (
      referenceMap.get(raw.toLowerCase()) ||
      referenceMap.get(normalizeRef(raw))
    );
  };

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nestedNodes = new Set<string>();

  containerRefs.forEach((reference, childId) => {
    const parentId = resolveNode(reference);
    if (!parentId || parentId === childId) return;
    const parent = nodeById.get(parentId);
    const child = nodeById.get(childId);
    if (!parent || parent.type !== "container" || !child) return;
    if (child.type === "container") return;
    child.containerId = parent.id;
    nestedNodes.add(child.id);
  });

  const rawConnections = Array.isArray(source.connections)
    ? source.connections
    : Array.isArray(source.edges)
      ? source.edges
      : [];

  const connections: DiagramConnection[] = [];
  const connectionIndex = new Map<string, number>();

  rawConnections.slice(0, MAX_CONNECTIONS).forEach((rawConnection) => {
    const raw = asRecord(rawConnection);
    const from = resolveNode(raw.from ?? raw.source ?? raw.start);
    const to = resolveNode(raw.to ?? raw.target ?? raw.end);
    if (!from || !to) {
      if (warnings.length < 6) {
        warnings.push("Some connections referenced nodes that do not exist.");
      }
      return;
    }
    if (from === to) return;

    const label = asText(raw.label ?? raw.name, 90);
    const key = `${from}->${to}`;
    const existingIndex = connectionIndex.get(key);
    if (existingIndex !== undefined) {
      const existing = connections[existingIndex];
      if (label && !existing.label) {
        existing.label = label;
      } else if (label && existing.label && !existing.label.includes(label)) {
        existing.label = `${existing.label} · ${label}`.slice(0, 120);
      }
      if (raw.bidirectional === true || raw.bidirectional === "true") {
        existing.bidirectional = true;
      }
      const arrowhead = normalizeArrowhead(
        raw.arrowhead ?? raw.endArrowhead ?? raw.marker
      );
      if (existing.arrowhead === "none" && arrowhead !== "none") {
        existing.arrowhead = arrowhead;
      }
      return;
    }

    connectionIndex.set(key, connections.length);
    connections.push({
      from,
      to,
      ...(label ? { label } : {}),
      style: normalizeStrokeStyle(raw.style ?? raw.strokeStyle, "solid"),
      ...(raw.color !== undefined
        ? { color: normalizeColor(raw.color) }
        : {}),
      arrowhead: normalizeArrowhead(
        raw.arrowhead ?? raw.endArrowhead ?? raw.marker
      ),
      bidirectional: raw.bidirectional === true || raw.bidirectional === "true",
    });
  });

  const rawGroups = Array.isArray(source.groups) ? source.groups : [];
  const groups: DiagramGroup[] = [];
  rawGroups.slice(0, 14).forEach((rawGroup) => {
    const raw = asRecord(rawGroup);
    const title = asText(raw.title ?? raw.name ?? raw.label, 70);
    const rawIds = Array.isArray(raw.nodeIds)
      ? raw.nodeIds
      : Array.isArray(raw.nodes)
        ? raw.nodes
        : [];
    const nodeIds = Array.from(
      new Set(
        rawIds
          .map((nodeId) => resolveNode(nodeId))
          .filter((nodeId): nodeId is string => Boolean(nodeId))
      )
    );
    if (!title || nodeIds.length === 0) return;
    groups.push({
      title,
      nodeIds,
      color: normalizeColor(raw.color ?? "sand"),
    });
  });

  // A group that contains exactly one container is almost always a panel or
  // screen. Treat the other members as children of that container so the
  // compiler can stack them inside it instead of dropping them into separate
  // global rows. Explicit containerId/parentId values always win.
  groups.forEach((group) => {
    const containers = group.nodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is DiagramNode => node?.type === "container");
    if (containers.length !== 1) return;

    const parent = containers[0];
    group.nodeIds.forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node || node.id === parent.id || node.type === "container") return;
      if (nestedNodes.has(node.id)) return;
      node.containerId = parent.id;
      nestedNodes.add(node.id);
    });
  });

  const diagramType =
    asText(source.diagramType ?? source.kind ?? source.category, 48) ||
    "Concept map";
  const title =
    asText(source.title ?? source.name, 90) || `${diagramType} · Untitled`;
  const summary = asText(source.summary ?? source.explanation, 7000);
  const rawNotes = Array.isArray(source.notes)
    ? source.notes
    : Array.isArray(source.assumptions)
      ? source.assumptions
      : [];
  const notes = rawNotes
    .map((note) => asText(note, 240))
    .filter(Boolean)
    .slice(0, 8);

  if (connections.length === 0 && nodes.length > 1) {
    warnings.push("The generated diagram has no relationships between nodes.");
  }

  return {
    title,
    diagramType,
    summary,
    notes,
    nodes,
    connections,
    groups,
    warnings: warnings.slice(0, 6),
  };
}

interface LayoutNode {
  node: DiagramNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

function prepareContainerChildren(nodes: DiagramNode[]): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, DiagramNode[]>();

  nodes.forEach((node) => {
    if (!node.containerId) return;
    const children = childrenByParent.get(node.containerId) || [];
    children.push(node);
    childrenByParent.set(node.containerId, children);
  });

  childrenByParent.forEach((children, parentId) => {
    const parent = nodeById.get(parentId);
    if (!parent || parent.type !== "container" || children.length === 0) return;

    const maxChildWidth = Math.max(...children.map((child) => child.width));
    parent.width = Math.max(
      parent.width,
      maxChildWidth + CONTAINER_SIDE_PADDING * 2
    );

    const ordered = [...children].sort((a, b) => {
      const rowDiff = (a.row ?? 0) - (b.row ?? 0);
      if (rowDiff !== 0) return rowDiff;
      return (a.column ?? 0) - (b.column ?? 0);
    });
    const availableWidth = Math.max(
      80,
      parent.width - CONTAINER_SIDE_PADDING * 2
    );
    ordered.forEach((child) => {
      if (child.width > availableWidth) {
        child.width = availableWidth;
        if (child.type !== "text") {
          child.height = clamp(
            estimateTextHeight(
              child.label,
              child.sublabel,
              child.width,
              child.fontSize,
              child.height,
              child.type
            ),
            44,
            760
          );
        }
      }
      if (child.type === "text") wrapNodeText(child);
    });

    const contentHeight =
      CONTAINER_TOP_PADDING +
      ordered.reduce(
        (total, child, index) =>
          total + child.height + (index > 0 ? CONTAINER_CHILD_GAP : 0),
        0
      ) +
      CONTAINER_BOTTOM_PADDING;
    parent.height = Math.max(parent.height, contentHeight);
  });
}

function computeLayout(
  nodes: DiagramNode[],
  connections: DiagramConnection[]
): Map<string, LayoutNode> {
  prepareContainerChildren(nodes);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const rootNodes = nodes.filter((node) => !node.containerId);
  const rootIds = new Set(rootNodes.map((node) => node.id));
  const rootIdFor = (id: string): string => {
    return nodeById.get(id)?.containerId || id;
  };

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  rootNodes.forEach((node) => {
    outgoing.set(node.id, []);
    indegree.set(node.id, 0);
  });

  let rootConnectionCount = 0;
  connections.forEach((connection) => {
    const from = rootIdFor(connection.from);
    const to = rootIdFor(connection.to);
    if (!from || !to || from === to) return;
    if (!rootIds.has(from) || !rootIds.has(to)) return;
    outgoing.get(from)?.push(to);
    indegree.set(to, (indegree.get(to) || 0) + 1);
    rootConnectionCount += 1;
  });

  const depth = new Map<string, number>();
  const queue = rootNodes
    .filter((node) => (indegree.get(node.id) || 0) === 0)
    .map((node) => node.id);
  if (queue.length === 0 && rootNodes.length > 0) {
    depth.set(rootNodes[0].id, 0);
    queue.push(rootNodes[0].id);
  }

  const processed = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (processed.has(id)) continue;
    processed.add(id);
    for (const target of outgoing.get(id) || []) {
      depth.set(
        target,
        Math.max(depth.get(target) || 0, (depth.get(id) || 0) + 1)
      );
      const nextDegree = (indegree.get(target) || 0) - 1;
      indegree.set(target, nextDegree);
      if (nextDegree === 0) queue.push(target);
    }
  }

  if (rootConnectionCount === 0) {
    // A list or checklist is a valid visual. Keep it in one column so it reads
    // as a sequence rather than being scattered across the canvas.
    rootNodes.forEach((node) => depth.set(node.id, 0));
  } else {
    // Cyclic graphs are still useful diagrams. Give any leftover nodes a
    // stable column so they do not all collapse on top of one another.
    let fallbackColumn = 0;
    rootNodes.forEach((node) => {
      if (!depth.has(node.id)) {
        depth.set(node.id, fallbackColumn % 4);
        fallbackColumn += 1;
      }
    });
  }

  const rowsUsed = new Map<number, number>();
  const positions = new Map<string, { column: number; row: number }>();

  rootNodes.forEach((node) => {
    const column = node.column ?? depth.get(node.id) ?? 0;
    const nextRow = rowsUsed.get(column) || 0;
    const row = node.row ?? nextRow;
    rowsUsed.set(column, Math.max(nextRow, Math.floor(row) + 1));
    positions.set(node.id, { column, row });
  });

  const columns = Array.from(
    new Set(rootNodes.map((node) => positions.get(node.id)!.column))
  ).sort((a, b) => a - b);
  const rows = Array.from(
    new Set(rootNodes.map((node) => positions.get(node.id)!.row))
  ).sort((a, b) => a - b);

  const columnWidth = new Map<number, number>();
  columns.forEach((column) => {
    const widths = rootNodes
      .filter((node) => positions.get(node.id)!.column === column)
      .map((node) => node.width);
    columnWidth.set(
      column,
      Math.max(COLUMN_MIN_WIDTH, ...(widths.length ? widths : [COLUMN_MIN_WIDTH]))
    );
  });

  const rowHeight = new Map<number, number>();
  rows.forEach((row) => {
    const heights = rootNodes
      .filter((node) => positions.get(node.id)!.row === row)
      .map((node) => node.height);
    rowHeight.set(
      row,
      Math.max(ROW_MIN_HEIGHT, ...(heights.length ? heights : [ROW_MIN_HEIGHT]))
    );
  });

  const columnX = new Map<number, number>();
  let cursorX = 0;
  columns.forEach((column) => {
    columnX.set(column, cursorX);
    cursorX += (columnWidth.get(column) || COLUMN_MIN_WIDTH) + COLUMN_GAP;
  });

  const rowY = new Map<number, number>();
  let cursorY = 0;
  rows.forEach((row) => {
    rowY.set(row, cursorY);
    cursorY += (rowHeight.get(row) || ROW_MIN_HEIGHT) + ROW_GAP;
  });

  const layout = new Map<string, LayoutNode>();
  rootNodes.forEach((node) => {
    const position = positions.get(node.id)!;
    const colWidth = columnWidth.get(position.column) || COLUMN_MIN_WIDTH;
    const rowHeightValue = rowHeight.get(position.row) || ROW_MIN_HEIGHT;
    const x =
      node.type === "container"
        ? columnX.get(position.column) || 0
        : (columnX.get(position.column) || 0) +
          Math.max(0, (colWidth - node.width) / 2);
    const y =
      node.type === "container"
        ? rowY.get(position.row) || 0
        : (rowY.get(position.row) || 0) +
          Math.max(0, (rowHeightValue - node.height) / 2);
    layout.set(node.id, {
      node,
      x,
      y,
      width: node.width,
      height: node.height,
    });
  });

  const childrenByParent = new Map<string, DiagramNode[]>();
  nodes.forEach((node) => {
    if (!node.containerId) return;
    const children = childrenByParent.get(node.containerId) || [];
    children.push(node);
    childrenByParent.set(node.containerId, children);
  });

  childrenByParent.forEach((children, parentId) => {
    const parent = layout.get(parentId);
    if (!parent) return;

    const ordered = [...children].sort((a, b) => {
      const rowDiff = (a.row ?? 0) - (b.row ?? 0);
      if (rowDiff !== 0) return rowDiff;
      return (a.column ?? 0) - (b.column ?? 0);
    });
    const availableWidth = Math.max(
      80,
      parent.width - CONTAINER_SIDE_PADDING * 2
    );
    let childY = parent.y + CONTAINER_TOP_PADDING;

    ordered.forEach((child) => {
      const width = Math.min(child.width, availableWidth);
      const x =
        child.type === "text"
          ? parent.x + CONTAINER_SIDE_PADDING
          : parent.x +
            CONTAINER_SIDE_PADDING +
            Math.max(0, (availableWidth - width) / 2);
      layout.set(child.id, {
        node: child,
        x,
        y: childY,
        width,
        height: child.height,
      });
      childY += child.height + CONTAINER_CHILD_GAP;
    });
  });

  return layout;
}

interface Anchor {
  x: number;
  y: number;
}

function anchorsFor(source: LayoutNode, target: LayoutNode): {
  start: Anchor;
  end: Anchor;
} {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? {
          start: { x: source.x + source.width, y: sourceCenterY },
          end: { x: target.x, y: targetCenterY },
        }
      : {
          start: { x: source.x, y: sourceCenterY },
          end: { x: target.x + target.width, y: targetCenterY },
        };
  }

  return dy >= 0
    ? {
        start: { x: sourceCenterX, y: source.y + source.height },
        end: { x: targetCenterX, y: target.y },
      }
    : {
        start: { x: sourceCenterX, y: source.y },
        end: { x: targetCenterX, y: target.y + target.height },
      };
}

function segmentIntersectsNode(
  start: Anchor,
  end: Anchor,
  node: LayoutNode,
  margin = 8
): boolean {
  const minX = node.x - margin;
  const maxX = node.x + node.width + margin;
  const minY = node.y - margin;
  const maxY = node.y + node.height + margin;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [start.x - minX, maxX - start.x, start.y - minY, maxY - start.y];
  let lower = 0;
  let upper = 1;

  for (let index = 0; index < 4; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) return false;
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) {
      if (ratio > upper) return false;
      lower = Math.max(lower, ratio);
    } else {
      if (ratio < lower) return false;
      upper = Math.min(upper, ratio);
    }
  }

  return lower <= upper;
}

function pathIntersectsNode(
  path: Anchor[],
  node: LayoutNode,
  margin = 8
): boolean {
  for (let index = 0; index < path.length - 1; index += 1) {
    if (segmentIntersectsNode(path[index], path[index + 1], node, margin)) {
      return true;
    }
  }
  return false;
}

/**
 * Most connections can be a straight line. When another node sits directly on
 * that line, route the arrow around the obstacle instead of drawing through a
 * box. This matters for wide architecture boards where two services share a
 * row with a third service between them.
 */
function routeArrow(
  start: Anchor,
  end: Anchor,
  sourceId: string,
  targetId: string,
  layout: Map<string, LayoutNode>
): Anchor[] {
  const candidates = Array.from(layout.values()).filter(
    (node) =>
      node.node.id !== sourceId &&
      node.node.id !== targetId &&
      node.node.type !== "container" &&
      node.node.type !== "text"
  );
  const obstacles = candidates.filter((node) =>
    segmentIntersectsNode(start, end, node, 10)
  );
  if (obstacles.length === 0) return [start, end];

  const horizontal =
    Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const gap = 26;
  const left = Math.min(...obstacles.map((node) => node.x));
  const right = Math.max(...obstacles.map((node) => node.x + node.width));
  const top = Math.min(...obstacles.map((node) => node.y));
  const bottom = Math.max(...obstacles.map((node) => node.y + node.height));
  const movingRight = end.x >= start.x;
  const movingDown = end.y >= start.y;
  const entryX = movingRight ? left - gap : right + gap;
  const exitX = movingRight ? right + gap : left - gap;
  const entryY = movingDown ? top - gap : bottom + gap;
  const exitY = movingDown ? bottom + gap : top - gap;
  const lanes = horizontal ? [bottom + gap, top - gap] : [right + gap, left - gap];
  const midpoint = horizontal ? (start.y + end.y) / 2 : (start.x + end.x) / 2;
  const directLength = Math.hypot(end.x - start.x, end.y - start.y);

  const routeLength = (path: Anchor[]): number => {
    let total = 0;
    for (let index = 0; index < path.length - 1; index += 1) {
      total += Math.hypot(
        path[index + 1].x - path[index].x,
        path[index + 1].y - path[index].y
      );
    }
    return total;
  };

  const routes = lanes.map((lane) => {
    const path = horizontal
      ? [
          start,
          { x: entryX, y: start.y },
          { x: entryX, y: lane },
          { x: exitX, y: lane },
          { x: exitX, y: end.y },
          end,
        ]
      : [
          start,
          { x: start.x, y: entryY },
          { x: lane, y: entryY },
          { x: lane, y: exitY },
          { x: end.x, y: exitY },
          end,
        ];
    const cost = candidates.reduce(
      (total, node) => total + (pathIntersectsNode(path, node, 6) ? 1 : 0),
      0
    );
    return {
      path,
      cost,
      length: routeLength(path),
      distance: Math.abs(lane - midpoint),
    };
  });

  routes.sort((leftRoute, rightRoute) => {
    return (
      leftRoute.cost - rightRoute.cost ||
      leftRoute.length - rightRoute.length ||
      leftRoute.distance - rightRoute.distance
    );
  });
  const best = routes[0];
  return best.length > directLength * 2.6 ? [start, end] : best.path;
}

function textElement(
  id: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  textAlign: "left" | "center" | "right" = "left"
): DiagramElement {
  return {
    id,
    type: "text",
    x,
    y,
    text,
    fontSize,
    fontFamily: FONT_FAMILY,
    strokeColor: color,
    textAlign,
    roughness: 0,
  };
}

/**
 * Compile a normalized spec into Excalidraw skeleton elements.
 *
 * Shape labels and arrows use Excalidraw's skeleton binding fields, so the
 * result remains editable: labels stay inside their containers and arrows stay
 * attached when nodes move.
 */
export function compileDiagram(spec: DiagramSpec): CompiledDiagram {
  const layout = computeLayout(spec.nodes, spec.connections);
  const nodeIdMap = new Map<string, string>();
  spec.nodes.forEach((node, index) => {
    nodeIdMap.set(node.id, `node-${index}`);
  });

  const groupShapes: DiagramElement[] = [];
  const groupLabels: DiagramElement[] = [];
  const containerShapes: DiagramElement[] = [];
  const containerLabels: DiagramElement[] = [];
  const shapes: DiagramElement[] = [];
  const textNodes: DiagramElement[] = [];
  const arrows: DiagramElement[] = [];

  spec.groups.forEach((group, index) => {
    const members = group.nodeIds
      .map((nodeId) => layout.get(nodeId))
      .filter((node): node is LayoutNode => Boolean(node));
    if (members.length === 0) return;

    const paddingX = 30;
    const paddingTop = 30;
    const paddingBottom = 22;
    const minX = Math.min(...members.map((member) => member.x)) - paddingX;
    const minY = Math.min(...members.map((member) => member.y)) - paddingTop;
    const maxX =
      Math.max(...members.map((member) => member.x + member.width)) + paddingX;
    const maxY =
      Math.max(...members.map((member) => member.y + member.height)) +
      paddingBottom;
    const palette = PALETTES[group.color];

    groupShapes.push({
      id: `group-${index}`,
      type: "rectangle",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      backgroundColor: palette.bg,
      strokeColor: palette.stroke,
      fillStyle: "solid",
      strokeStyle: "dashed",
      strokeWidth: 1,
      roughness: 0,
      opacity: 48,
      roundness: { type: 3 },
    });
    groupLabels.push(
      textElement(
        `group-label-${index}`,
        group.title.toUpperCase(),
        minX + 14,
        minY + 10,
        11,
        palette.sub
      )
    );
  });

  spec.nodes.forEach((node, index) => {
    const position = layout.get(node.id);
    if (!position) return;
    const palette = PALETTES[node.color];
    const internalId = nodeIdMap.get(node.id) || `node-${index}`;

    if (node.type === "text") {
      const text = node.sublabel
        ? `${node.label}\n${node.sublabel}`
        : node.label;
      textNodes.push(
        textElement(
          internalId,
          text,
          position.x,
          position.y,
          node.fontSize,
          palette.text
        )
      );
      return;
    }

    if (node.type === "container") {
      containerShapes.push({
        id: internalId,
        type: "rectangle",
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        backgroundColor: palette.bg,
        strokeColor: palette.stroke,
        fillStyle: node.fillStyle,
        strokeStyle: node.strokeStyle,
        strokeWidth: 1.4,
        roughness: 0,
        opacity: node.opacity,
        roundness: { type: 3 },
      });
      containerLabels.push(
        textElement(
          `${internalId}-label`,
          node.label,
          position.x + 18,
          position.y + 15,
          Math.max(node.fontSize, 14),
          palette.text
        )
      );
      if (node.sublabel) {
        containerLabels.push(
          textElement(
            `${internalId}-sublabel`,
            node.sublabel,
            position.x + 18,
            position.y + 39,
            11,
            palette.sub
          )
        );
      }
      return;
    }

    const label = node.sublabel
      ? `${node.label}\n${node.sublabel}`
      : node.label;

    shapes.push({
      id: internalId,
      type: node.type,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      backgroundColor: palette.bg,
      strokeColor: palette.stroke,
      fillStyle: node.fillStyle,
      strokeStyle: node.strokeStyle,
      strokeWidth: 1.8,
      roughness: 0,
      opacity: node.opacity,
      roundness: node.type === "rectangle" ? { type: 3 } : undefined,
      label: {
        text: label,
        fontSize: node.fontSize,
        fontFamily: FONT_FAMILY,
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: palette.text,
      },
    });
  });

  const nodeTypeById = new Map(
    spec.nodes.map((node) => [node.id, node.type])
  );

  spec.connections.forEach((connection, index) => {
    const source = layout.get(connection.from);
    const target = layout.get(connection.to);
    if (!source || !target) return;
    const anchors = anchorsFor(source, target);
    const path = routeArrow(
      anchors.start,
      anchors.end,
      connection.from,
      connection.to,
      layout
    );
    const routed = path.length > 2;
    const dx = anchors.end.x - anchors.start.x;
    const dy = anchors.end.y - anchors.start.y;
    const pathXs = path.map((point) => point.x);
    const pathYs = path.map((point) => point.y);
    const pathMinX = routed ? Math.min(...pathXs) : anchors.start.x;
    const pathMinY = routed ? Math.min(...pathYs) : anchors.start.y;
    const pathMaxX = routed ? Math.max(...pathXs) : anchors.start.x;
    const pathMaxY = routed ? Math.max(...pathYs) : anchors.start.y;
    const points: [number, number][] = routed
      ? path.map((point) => [point.x - pathMinX, point.y - pathMinY])
      : [
          [0, 0],
          [dx, dy],
        ];
    const palette = connection.color
      ? PALETTES[connection.color]
      : undefined;

    // Excalidraw's skeleton binder duplicates a text element when an arrow is
    // bound directly to it. Keep arrows visually aligned to text endpoints but
    // only create real bindings for shape/container endpoints.
    const startBinding =
      nodeTypeById.get(connection.from) === "text"
        ? undefined
        : { id: nodeIdMap.get(connection.from) || connection.from };
    const endBinding =
      nodeTypeById.get(connection.to) === "text"
        ? undefined
        : { id: nodeIdMap.get(connection.to) || connection.to };

    arrows.push({
      id: `edge-${index}`,
      type: "arrow",
      x: pathMinX,
      y: pathMinY,
      width: routed
        ? Math.max(pathMaxX - pathMinX, 1)
        : Math.max(Math.abs(dx), 1),
      height: routed
        ? Math.max(pathMaxY - pathMinY, 1)
        : Math.max(Math.abs(dy), 1),
      points,
      strokeColor: palette?.stroke || EDGE_COLOR,
      strokeWidth: 1.6,
      strokeStyle: connection.style,
      roughness: 0,
      opacity: 92,
      ...(startBinding ? { start: startBinding } : {}),
      ...(endBinding ? { end: endBinding } : {}),
      startArrowhead: connection.bidirectional ? "arrow" : null,
      endArrowhead:
        connection.arrowhead === "none" ? null : connection.arrowhead,
      ...(connection.label
        ? {
            label: {
              text: connection.label,
              fontSize: 11,
              fontFamily: FONT_FAMILY,
              textAlign: "center" as const,
              verticalAlign: "middle" as const,
              strokeColor: EDGE_COLOR,
            },
          }
        : {}),
    });
  });

  const allNodeBounds = Array.from(layout.values());
  const minNodeX =
    allNodeBounds.length > 0
      ? Math.min(...allNodeBounds.map((node) => node.x))
      : 0;
  const minNodeY =
    allNodeBounds.length > 0
      ? Math.min(...allNodeBounds.map((node) => node.y))
      : 0;
  const groupTop =
    groupShapes.length > 0
      ? Math.min(...groupShapes.map((group) => group.y))
      : minNodeY;
  const titleX = minNodeX - 34;
  const titleY = groupTop - 88;

  const titleElements: DiagramElement[] = [
    textElement("diagram-title", spec.title, titleX, titleY, 26, "#151714"),
    textElement(
      "diagram-type",
      defaultTypeLabel(spec).toUpperCase(),
      titleX,
      titleY + 36,
      10.5,
      "#6c726d"
    ),
  ];

  const summaryParts = [
    spec.summary.trim() ||
      `A ${spec.diagramType.toLowerCase()} with ${spec.nodes.length} nodes, generated from your request.`,
  ];
  if (spec.notes.length > 0) {
    summaryParts.push(
      `Notes\n${spec.notes.map((note) => `- ${note}`).join("\n")}`
    );
  }

  return {
    elements: [
      ...groupShapes,
      ...groupLabels,
      ...containerShapes,
      ...containerLabels,
      ...shapes,
      ...textNodes,
      ...arrows,
      ...titleElements,
    ],
    title: spec.title,
    diagramType: spec.diagramType,
    summary: summaryParts.join("\n\n"),
    warnings: spec.warnings,
  };
}

export function compileDiagramFromUnknown(input: unknown): CompiledDiagram {
  return compileDiagram(normalizeDiagramSpec(input));
}
