'use client';

/**
 * Capabilities — a chapter-based tour of what ScribeBoard can do.
 *
 * The page is organised as five numbered chapters plus a hero. Each chapter
 * carries one live demonstration rather than a static screenshot: the hero
 * board tilts toward the pointer, the first chapter types out a prompt and
 * then draws its own flowchart, the second lets you spawn and drag shapes, the
 * third injects a service into a diagram, the fourth shows live collaborators,
 * and the fifth exports.
 *
 * A fixed progress bar tracks reading position and a floating controller lets
 * the reader jump between chapters.
 *
 * Structure is Tailwind utilities; the handful of effects that utilities
 * cannot express live in CapabilitiesShowcase.css.
 */

import Link from 'next/link';
import ClosingHub from './ClosingHub';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Box, Check, Download, FileText,
  GitBranch, Globe, ImageIcon, Layers, LayoutGrid, Link2, Lock, MousePointer2,
  Network, Palette, Pencil, PencilRuler, Plus, RotateCcw, Save, Search, Share,
  Sparkles, Square, Type, X, Zap,
} from '@/lib/icons';
import './CapabilitiesShowcase.css';

const FLOW_PROMPT = 'Build a user authentication flow';

/* ------------------------------------------------------------------ *
 * Small shared pieces
 * ------------------------------------------------------------------ */

function Checklist({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2.5 pt-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-[var(--muted-ink)]">
          <Check size={16} className="shrink-0 text-[var(--heading-accent)]" strokeWidth={2.5} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureGrid({ items }: { items: readonly { label: string; Icon: typeof Square; tone: string }[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-4 pt-2">
      {items.map(({ label, Icon, tone }) => (
        <div key={label} className="flex items-center gap-2.5 text-xs font-bold text-[var(--ink)]">
          <Icon size={16} className={`shrink-0 ${tone}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** The number + label that heads every chapter. */
function ChapterLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="capx-mono text-2xl font-bold text-[var(--rule)]">{number}</span>
      <span className="capx-mono text-xs font-bold uppercase tracking-wider text-[var(--muted-ink)]">{label}</span>
    </div>
  );
}

/** The little hand-drawn arrow the reference uses to point at a demo. */
/**
 * A hand-written annotation that points down at the thing it describes.
 *
 * Every note on this page sits directly above its target, so the arrow always
 * points straight down. Earlier versions let the arrow lean left or right,
 * which left it aimed at empty space beside the target rather than at it.
 *
 * The note is anchored with `bottom-full` by its caller, so its bottom edge
 * sits a fixed distance above the target however tall the note itself is.
 */
function HandNote({
  children,
  className = '',
  tone = 'text-[var(--heading-accent)]',
}: {
  children: ReactNode;
  className?: string;
  tone?: string;
}) {
  return (
    <div className={`absolute z-20 hidden flex-col items-center gap-0.5 sm:flex ${className}`}>
      <span className={`capx-hand text-lg leading-tight ${tone}`}>{children}</span>
      <svg
        className={`h-6 w-6 shrink-0 ${tone}`}
        viewBox="0 0 22 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 2C3 9 6 16 13 20" />
        <path d="M13 20L6 19M13 20L12 13" />
      </svg>
    </div>
  );
}

/** Browser chrome for the demo cards. */
/**
 * The macOS window chrome: traffic lights, a title, and optional actions.
 *
 * Every framed card on this page uses it, so the canvas, the side panels, and
 * the small diagram nodes all read as the same family of surfaces.
 */
function WindowBar({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        {icon}
        <span className="ml-2 text-xs font-bold text-[var(--muted-ink)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * A small diagram node. Drawn as a card so it belongs to the same family as
 * the big canvas, but deliberately without window chrome — the traffic lights
 * belong to the framed panels, and repeating them at this size just adds
 * noise.
 */
function NodeCard({
  title,
  Icon,
  tone,
  className = '',
}: {
  title: string;
  Icon: typeof Globe;
  tone: string;
  className?: string;
}) {
  return (
    <div className={`capx-spring flex flex-col items-center gap-1.5 rounded-2xl border bg-white p-2.5 shadow-sm ${tone} ${className}`}>
      <Icon size={16} />
      <span className="text-[10px] font-bold text-[var(--ink)]">{title}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 00 — the hero board
 * ------------------------------------------------------------------ */

function HeroStage() {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = frame.getBoundingClientRect();
      // Only tilt while the board is actually on screen.
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) / (rect.width / 2);
      const dy = (event.clientY - cy) / (rect.height / 2);
      frame.style.transform = `rotateX(${(-dy * 4).toFixed(2)}deg) rotateY(${(dx * 4).toFixed(2)}deg)`;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      frame.style.transform = '';
    };
  }, []);

  const nodes = [
    { label: 'Web App', Icon: Globe, tone: 'border-blue-200 text-blue-600' },
    { label: 'API', Icon: Network, tone: 'border-emerald-200 text-[var(--heading-accent)]' },
    { label: 'AI Service', Icon: Box, tone: 'border-purple-200 text-purple-600' },
  ];

  return (
    <div className="capx-3d relative w-full">
      {/* Above the board, pointing down into it — clear of the window's
          Export button, which a fixed offset used to overlap. */}
      <HandNote className="bottom-full right-0 mb-2 text-right text-purple-700" tone="text-purple-700">
        Visualize. Collaborate.
        <br />
        Build.
      </HandNote>

      <div ref={frameRef} className="capx-3d-frame capx-stage relative w-full overflow-hidden rounded-3xl border border-[var(--rule)] bg-white">
        <div className="flex h-11 items-center justify-between border-b border-[var(--rule)] bg-neutral-50/90 px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            <span className="ml-2 whitespace-nowrap text-xs font-bold text-[var(--muted-ink)]">● AI Whiteboard</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-neutral-200/60 p-0.5 text-[11px] font-bold">
            <span className="rounded-md bg-white px-2.5 py-0.5 text-[var(--ink)] shadow-2xs">Whiteboard</span>
            <span className="rounded-md px-2.5 py-0.5 text-[var(--muted-ink)]">Doc</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
              <Save size={12} /> Save
            </span>
            <span className="flex items-center gap-1 rounded-md border border-[var(--rule)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--muted-ink)]">
              <Share size={12} /> Share
            </span>
            <span className="flex items-center gap-1 rounded-md border border-[var(--rule)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--muted-ink)]">
              <Download size={12} /> Export
            </span>
          </div>
        </div>

        <div className="capx-canvas relative flex min-h-[390px] flex-col justify-between overflow-hidden p-6">
          <div className="absolute left-4 top-6 z-20 flex flex-col gap-2 rounded-xl border border-[var(--rule)] bg-white/95 p-1.5 shadow-md">
            {[MousePointer2, Square, Type, GitBranch, Plus].map((Icon, index) => (
              <span
                key={index}
                className={`flex size-7 items-center justify-center rounded-lg ${
                  index === 0 ? 'bg-emerald-50 text-[var(--heading-accent)]' : 'text-[var(--muted-ink)]'
                }`}
              >
                <Icon size={14} />
              </span>
            ))}
          </div>

          <div className="absolute right-5 top-4 z-10 max-w-[128px] rotate-2 rounded-xl border border-amber-200/80 bg-amber-50/90 p-2 text-base leading-tight text-[var(--muted-ink)] shadow-2xs">
            <span className="capx-hand">From a simple prompt to a complete system.</span>
          </div>

          <div className="relative z-10 mx-auto mt-20 mb-4 flex w-full max-w-[460px] items-center justify-between pb-28">
            {nodes.map(({ label, Icon, tone }, index) => (
              <div key={label} className="flex items-center gap-2">
                {index > 0 && <span className="h-0.5 w-6 bg-neutral-300" aria-hidden="true" />}
                <div className={`flex w-24 flex-col items-center gap-1.5 rounded-2xl border bg-white p-3 shadow-md ${tone}`}>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-current/10">
                    <Icon size={20} />
                  </span>
                  <span className="text-[11px] font-bold text-[var(--ink)]">{label}</span>
                </div>
              </div>
            ))}

            {/* The database hangs below the middle node. It lives inside the row
                rather than being pinned to the canvas, so it stays aligned
                with the API node however the row reflows. */}
            <div className="absolute left-1/2 top-[78px] h-9 w-0.5 -translate-x-1/2 bg-neutral-300" aria-hidden="true" />
            <div className="capx-spring absolute left-1/2 top-[118px] flex w-24 -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl border border-amber-200 bg-white p-3 shadow-md">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Layers size={20} />
              </span>
              <span className="text-[11px] font-bold text-[var(--ink)]">Database</span>
            </div>
          </div>

          <div className="z-10 mx-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-2xl border border-[var(--rule)] bg-white/95 px-4 py-2.5 shadow-sm">
            <span className="truncate text-xs font-semibold tracking-tight text-[var(--ink)]">Build an AI-powered SaaS architecture</span>
            <span className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-2xs">
              <Plus size={12} /> Generate
            </span>
          </div>

          <div className="z-10 flex items-center gap-2 pt-2 text-xs font-semibold text-[var(--muted-ink)]">
            <span className="capx-mono flex items-center gap-1 rounded-md border border-[var(--rule)] bg-white px-2 py-0.5 text-[11px]">
              100%
            </span>
            <span className="flex size-6 items-center justify-center rounded-md border border-[var(--rule)] bg-white">
              <RotateCcw size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 01 — a prompt that types itself, then draws its own diagram
 * ------------------------------------------------------------------ */

const FLOW_NODES = [
  { id: 'signup', label: 'User\nsign up', className: 'left-[10px] top-[45px] w-[90px] h-[60px] border-purple-200 bg-purple-50 text-purple-900' },
  { id: 'validate', label: 'Validate\ncredentials', className: 'left-[140px] top-[45px] w-[95px] h-[60px] border-blue-200 bg-blue-50 text-blue-900' },
  { id: 'decision', label: '', className: 'left-[275px] top-[40px] w-[70px] h-[70px]' },
  { id: 'error', label: 'Show error\nmessage', className: 'left-[395px] top-[45px] w-[95px] h-[60px] border-red-200 bg-red-50 text-red-800' },
  { id: 'session', label: 'Create session', className: 'left-[255px] top-[175px] w-[110px] h-[45px] border-emerald-300 bg-emerald-50 text-emerald-800' },
] as const;

const FLOW_WIRES = [
  { id: 'w1', x1: 100, y1: 75, x2: 138, y2: 75, stroke: '#3b82f6' },
  { id: 'w2', x1: 235, y1: 75, x2: 273, y2: 75, stroke: '#3b82f6' },
  { id: 'w3', x1: 345, y1: 75, x2: 393, y2: 75, stroke: '#ef4444' },
  { id: 'w4', x1: 310, y1: 110, x2: 310, y2: 173, stroke: '#10b981' },
] as const;

function GenerateStage() {
  const [typed, setTyped] = useState('');
  const [nodesIn, setNodesIn] = useState(0);
  const [wiresDrawn, setWiresDrawn] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'typing' | 'drawing' | 'done'>('idle');
  const sectionRef = useRef<HTMLElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Arm the nodes and wires for their entrance only once the sequence is
  // about to run, so a diagram is never left empty if the observer is quiet.
  const armed = phase !== 'idle';

  // The diagram is laid out in a fixed 520x260 space so the connector
  // coordinates and the node positions agree. When the column is narrower
  // than that, the whole thing scales down rather than letting the last node
  // clip off the edge.
  useEffect(() => {
    const element = matrixRef.current;
    if (!element) return;
    const measure = () => {
      const available = element.clientWidth;
      if (!available) return;
      setScale(Math.min(1, available / 520));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Type the prompt out once, when the chapter first comes into view.
  //
  // The observer is the trigger, but a timer backs it up: browsers throttle
  // observers in background tabs, and a diagram that never draws itself would
  // leave the section empty.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setPhase((current) => (current === 'idle' ? 'typing' : current));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { threshold: 0.35 },
    );
    observer.observe(section);

    const failsafe = window.setTimeout(start, 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'typing') return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(FLOW_PROMPT.slice(0, index));
      if (index >= FLOW_PROMPT.length) {
        window.clearInterval(timer);
        setPhase('drawing');
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Then build the diagram: nodes first, connectors after.
  //
  // The reset of `nodesIn` / `wiresDrawn` lives in `replay` and in the initial
  // state, not here — setting state synchronously in an effect body would
  // cause a cascading render.
  useEffect(() => {
    if (phase !== 'drawing') return;
    const timers: number[] = [];
    FLOW_NODES.forEach((_, index) => {
      timers.push(window.setTimeout(() => setNodesIn(index + 1), index * 140));
    });
    timers.push(
      window.setTimeout(
        () => {
          FLOW_WIRES.forEach((_, index) => {
            timers.push(window.setTimeout(() => setWiresDrawn(index + 1), index * 120));
          });
          timers.push(window.setTimeout(() => setPhase('done'), FLOW_WIRES.length * 120 + 200));
        },
        FLOW_NODES.length * 140,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase]);

  const replay = () => {
    setTyped('');
    setNodesIn(0);
    setWiresDrawn(0);
    setPhase('typing');
  };

  return (
    <section id="cap-01" ref={sectionRef} className="capx-reveal relative flex flex-col items-center justify-between gap-12 py-8 lg:flex-row">
      <div className="flex w-full flex-col items-start gap-4 lg:w-[45%]">
        <ChapterLabel number="01" label="AI-powered diagram generation" />
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-4xl lg:text-[46px]">
          Describe your idea.
          <br />
          <span className="text-[var(--ink)]">Get a visual diagram.</span>
        </h2>
        <p className="text-base font-normal leading-relaxed text-[var(--muted-ink)]">
          Turn natural language into professional diagrams, flowcharts, system architectures, and more — instantly.
        </p>
        <Checklist
          items={[
            'System architecture diagrams',
            'Flowcharts & user flows',
            'Database schemas',
            'Infrastructure diagrams',
            'And more…',
          ]}
        />
      </div>

      <div className="relative flex w-full flex-col gap-6 lg:w-[55%]">
        {/* Anchored to the prompt box, pointing down into it: describe the idea
            there, and the diagram appears below. `bottom-full` keeps the note
            clear of the box however tall the note itself is. */}
        <div className="relative">
          <HandNote className="bottom-full left-0 mb-2">
            Just describe
            <br />
            your idea.
          </HandNote>

          <div className="capx-stage flex flex-col items-center justify-between gap-4 rounded-3xl border border-[var(--rule)] bg-white p-5 sm:flex-row">
          <div className="flex w-full items-center gap-3">
            <span className="size-2.5 shrink-0 animate-ping rounded-full bg-blue-600" />
            <span className="text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-base">
              {typed}
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-600 align-middle" />
            </span>
          </div>
          <button
            type="button"
            onClick={replay}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus size={14} />
            <span>Generate</span>
          </button>
        </div>
        </div>

        <div className="capx-stage capx-canvas relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-3xl border border-[var(--rule)] p-5">
          <WindowBar title="User Authentication Flow">
            <button
              type="button"
              onClick={replay}
              className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800 active:scale-95"
            >
              <RotateCcw size={12} /> Redraw
            </button>
          </WindowBar>

          <div className="relative flex h-[270px] w-full items-center">
            <div className="mr-2 z-20 flex w-8 flex-col gap-2 rounded-xl border border-[var(--rule)] bg-white/95 p-1 shadow-2xs">
              {[MousePointer2, PencilRuler, Square, Type].map((Icon, index) => (
                <span
                  key={index}
                  className={`flex size-6 items-center justify-center rounded-md ${
                    index === 0 ? 'bg-blue-50 text-blue-600' : 'text-[var(--muted-ink)]'
                  }`}
                >
                  <Icon size={12} />
                </span>
              ))}
            </div>

            <div ref={matrixRef} className="relative h-full flex-1">
              <div
                style={{ width: 520, height: 260, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                className="relative"
              >
              <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 520 260" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="capxArrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
                  </marker>
                  <marker id="capxArrowRed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                  </marker>
                  <marker id="capxArrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
                  </marker>
                </defs>
                {FLOW_WIRES.map((wire, index) => (
                  <line
                    key={wire.id}
                    className={`capx-wire ${armed ? 'is-armed' : ''} ${index < wiresDrawn ? 'is-drawn' : ''}`}
                    x1={wire.x1}
                    y1={wire.y1}
                    x2={wire.x2}
                    y2={wire.y2}
                    stroke={wire.stroke}
                    strokeWidth={2}
                    strokeLinecap="round"
                    markerEnd={`url(#capxArrow${wire.stroke === '#ef4444' ? 'Red' : wire.stroke === '#10b981' ? 'Green' : 'Blue'})`}
                  />
                ))}
              </svg>

              {FLOW_NODES.map((node, index) => (
                <div
                  key={node.id}
                  className={`capx-flow-node capx-spring absolute z-20 flex items-center justify-center text-center ${
                    armed ? 'is-armed' : ''
                  } ${index < nodesIn ? 'is-in' : ''} ${node.className}`}
                >
                  {node.id === 'decision' ? (
                    <>
                      <span className="absolute inset-1.5 rotate-45 rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm" />
                      <span className="relative z-30 select-none text-xs font-extrabold text-amber-900">Valid?</span>
                      <span className="capx-hand absolute -right-7 top-1 z-30 text-[11px] font-bold text-red-500">No →</span>
                      <span className="capx-hand absolute -bottom-6 left-1/2 z-30 -translate-x-1/2 text-[11px] font-bold text-emerald-600">Yes ↓</span>
                    </>
                  ) : (
                    <span className="whitespace-pre-line text-xs font-bold leading-tight">{node.label}</span>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 02 — a canvas you can actually put things on
 * ------------------------------------------------------------------ */

type Spawned = {
  id: number;
  label: string;
  kind: 'rect' | 'circle' | 'diamond' | 'arrow' | 'text' | 'image' | 'icon';
  left: string;
  top: string;
  /** Which of the spawn slots this element was placed in. */
  slot: number;
  Icon?: typeof Globe;
};

/**
 * How many elements the demo canvas holds at once.
 *
 * The canvas is a sketchpad, not a filing cabinet: a small working set keeps
 * the board legible, and the oldest element is retired — visibly, and with an
 * explanation — the moment a new one needs the room.
 */


const MAX_ITEMS = 3;

/** Where new elements land, so they never stack on top of each other. */
const SPAWN_SLOTS = [
  { left: '4%', top: '64%' },
  { left: '30%', top: '64%' },
  { left: '56%', top: '64%' },
];

interface Board {
  items: Spawned[];
  /** Items mid-retirement, kept mounted so they can animate out. */
  leaving: Spawned[];
  notice: string;
  selectedId: number | null;
}

const EMPTY_BOARD: Board = { items: [], leaving: [], notice: '', selectedId: null };

const SHAPE_TOOLS: { kind: Spawned['kind']; label: string; Icon?: typeof Globe; swatch: string }[] = [
  { kind: 'rect', label: 'Rectangle', swatch: 'rounded-xs border-2 border-emerald-500' },
  { kind: 'circle', label: 'Circle', swatch: 'rounded-full border-2 border-amber-500' },
  { kind: 'diamond', label: 'Diamond', swatch: 'rotate-45 border-2 border-blue-500' },
  { kind: 'arrow', label: 'Arrow', Icon: ArrowUpRight, swatch: '' },
  { kind: 'text', label: 'Text', Icon: Type, swatch: '' },
  { kind: 'image', label: 'Image', Icon: ImageIcon, swatch: '' },
];

const ICON_TILES: { icon: typeof Globe; label: string; tone: string }[] = [
  { icon: Globe, label: 'Globe', tone: 'bg-blue-50 text-blue-600' },
  { icon: Network, label: 'Network', tone: 'bg-emerald-50 text-emerald-600' },
  { icon: Box, label: 'Service', tone: 'bg-purple-50 text-purple-600' },
  { icon: Lock, label: 'Lock', tone: 'bg-amber-50 text-amber-600' },
  { icon: Layers, label: 'Data', tone: 'bg-orange-50 text-orange-600' },
  { icon: Zap, label: 'Zap', tone: 'bg-rose-50 text-rose-600' },
];

function CanvasStage() {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const nextId = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  /** Add an element, retiring the oldest one if the canvas is full. */
  const addElement = useCallback(
    (element: Omit<Spawned, 'id' | 'left' | 'top' | 'slot'>) => {
      setBoard((current) => {
        // Take the first slot nobody is using, so a new element never lands on
        // top of one that is already there (which can happen after a delete).
        const taken = new Set(current.items.map((item) => item.slot));
        const free = SPAWN_SLOTS.findIndex((_, index) => !taken.has(index));
        const slotIndex = free === -1 ? current.items.length % SPAWN_SLOTS.length : free;
        const slot = SPAWN_SLOTS[slotIndex];

        const item: Spawned = {
          ...element,
          id: nextId.current++,
          left: slot.left,
          top: slot.top,
          slot: slotIndex,
        };

        const next = [...current.items, item];
        if (next.length <= MAX_ITEMS) {
          return {
            ...current,
            items: next,
            notice: `${item.label} added.`,
            selectedId: item.id,
          };
        }

        // The canvas is full: the oldest element retires to make room. It stays
        // mounted for a moment so it can fade out rather than blink away.
        const retired = next[0];
        window.setTimeout(() => {
          setBoard((now) => ({
            ...now,
            leaving: now.leaving.filter((entry) => entry.id !== retired.id),
          }));
        }, 400);

        return {
          items: next.slice(1),
          leaving: [...current.leaving, retired],
          notice: `${retired.label} retired to make room — the canvas holds ${MAX_ITEMS} elements.`,
          selectedId: item.id,
        };
      });
    },
    [],
  );

  const removeElement = useCallback((id: number) => {
    setBoard((current) => {
      const target = current.items.find((item) => item.id === id);
      if (!target) return current;
      return {
        ...current,
        items: current.items.filter((item) => item.id !== id),
        notice: `${target.label} removed.`,
        selectedId: current.selectedId === id ? null : current.selectedId,
      };
    });
  }, []);

  const clearBoard = useCallback(() => {
    setBoard((current) => {
      if (!current.items.length) return current;
      return { ...current, items: [], notice: 'Canvas cleared.', selectedId: null };
    });
  }, []);

  // Dragging is tracked on the document so a fast pointer that outruns the
  // element still moves it.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setBoard((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === drag.id
            ? {
                ...item,
                left: `${Math.max(0, drag.originLeft + dx)}px`,
                top: `${Math.max(0, drag.originTop + dy)}px`,
              }
            : item,
        ),
      }));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // The selected element can be removed with the keyboard, the way a canvas
  // app would.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      // Do not hijack Backspace while someone is typing in a field.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (board.selectedId === null) return;
      event.preventDefault();
      removeElement(board.selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board.selectedId, removeElement]);

  const oldestId = board.items.length >= MAX_ITEMS ? board.items[0]?.id : null;

  /** One element on the canvas: draggable, selectable, removable. */
  const renderElement = (item: Spawned, leaving = false) => (
    <div
      key={item.id}
      className={`capx-spring capx-spawned ${
        leaving ? 'is-leaving' : ''
      } ${!leaving && item.id === oldestId ? 'is-oldest' : ''} ${
        !leaving && item.id === board.selectedId ? 'is-selected' : ''
      }`}
      style={{ left: item.left, top: item.top }}
      role="button"
      tabIndex={leaving ? -1 : 0}
      aria-label={`${item.label} on the canvas. Select, then press Delete to remove it.`}
      onPointerDown={(event) => {
        if (leaving) return;
        const container = canvasRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const itemRect = event.currentTarget.getBoundingClientRect();
        dragRef.current = {
          id: item.id,
          startX: event.clientX,
          startY: event.clientY,
          originLeft: itemRect.left - containerRect.left,
          originTop: itemRect.top - containerRect.top,
        };
        setBoard((current) => ({ ...current, selectedId: item.id }));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          event.stopPropagation();
          removeElement(item.id);
        }
      }}
    >
      {item.kind === 'icon' && item.Icon ? (
        <item.Icon size={20} className="text-[var(--heading-accent)]" />
      ) : item.kind === 'circle' ? (
        <span className="size-14 rounded-full border-2 border-amber-500 bg-white" />
      ) : item.kind === 'diamond' ? (
        <span className="flex size-12 rotate-45 items-center justify-center border-2 border-blue-500 bg-white text-[10px]">
          <span className="-rotate-45">Node</span>
        </span>
      ) : item.kind === 'arrow' ? (
        <ArrowUpRight size={22} className="text-blue-600" />
      ) : (
        <span>{item.label}</span>
      )}

      {!leaving && (
        <button
          type="button"
          className="capx-remove"
          aria-label={`Remove ${item.label}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            removeElement(item.id);
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );

  return (
    <section id="cap-02" className="capx-reveal relative flex flex-col items-center justify-between gap-12 py-8 lg:flex-row">
      <div className="flex w-full flex-col items-start gap-4 lg:w-[42%]">
        <ChapterLabel number="02" label="Rich whiteboard tools" />
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-4xl lg:text-[46px]">
          More than diagrams.
          <br />
          <em className="capx-serif italic text-[var(--heading-accent)]">A complete canvas.</em>
        </h2>
        <p className="text-base font-normal leading-relaxed text-[var(--muted-ink)]">
          Express your ideas visually with powerful tools. Add shapes, text, images, icons, and connectors to make your diagrams truly yours.
        </p>
        <FeatureGrid
          items={[
            { label: 'Shapes & connectors', Icon: Square, tone: 'text-blue-600' },
            { label: 'Images & screenshots', Icon: ImageIcon, tone: 'text-emerald-600' },
            { label: 'Text & annotations', Icon: Type, tone: 'text-purple-600' },
            { label: 'Sticky notes', Icon: Pencil, tone: 'text-amber-600' },
            { label: 'Emoji & icon library', Icon: Palette, tone: 'text-rose-600' },
            { label: 'Infinite canvas', Icon: LayoutGrid, tone: 'text-cyan-600' },
          ]}
        />
      </div>

      <div className="capx-3d relative w-full lg:w-[56%]">
        <div className="relative">
        {/* Above the canvas, pointing down into the tool docks on its right. */}
        <HandNote className="bottom-full right-0 mb-2" tone="text-[var(--muted-ink)]">
          Make it yours.
        </HandNote>

        <div className="capx-stage capx-canvas relative flex min-h-[380px] flex-col overflow-hidden rounded-3xl border border-[var(--rule)] bg-white p-5">
          <WindowBar title="Whiteboard" />
          <div className="flex flex-1 items-center justify-between gap-4">
          <div className="z-10 flex w-28 select-none flex-col gap-2 rounded-2xl border border-[var(--rule)] bg-white/95 p-2.5 text-xs font-semibold text-[var(--muted-ink)] shadow-sm backdrop-blur-md">
            {SHAPE_TOOLS.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => addElement({ kind: tool.kind, label: tool.label.toUpperCase() })}
                className="flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-neutral-100 active:scale-95"
              >
                {tool.Icon ? (
                  <tool.Icon size={14} className="shrink-0 text-[var(--ink)]" />
                ) : (
                  <span className={`size-3.5 shrink-0 ${tool.swatch}`} />
                )}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>

          <div
            ref={canvasRef}
            className="relative h-[320px] flex-1"
            onPointerDown={(event) => {
              // Clicking the empty canvas clears the selection.
              if (event.target === event.currentTarget) {
                setBoard((current) => ({ ...current, selectedId: null }));
              }
            }}
          >
            <div className="capx-spring absolute -top-1 left-4 w-24 rotate-[-4deg] rounded-xl border border-pink-200 bg-pink-100 p-3 shadow-md">
              <p className="capx-hand text-sm font-bold leading-tight text-pink-900">Drag.<br />Drop.<br />Create.</p>
            </div>
            <div className="capx-spring absolute -top-2 right-12 w-24 rotate-[3deg] rounded-xl border border-purple-200 bg-purple-100 p-3 text-center shadow-md">
              <p className="capx-hand text-sm font-bold leading-tight text-purple-900">Fully<br />Editable</p>
            </div>

            <div className="absolute left-0 right-0 top-28 flex items-center justify-center gap-2 px-2">
              <div className="capx-spring relative flex flex-col items-center rounded-2xl border-2 border-blue-500 bg-white p-3 shadow-md">
                <span className="absolute -left-1.5 -top-1.5 size-2 rounded-full border border-white bg-blue-600" />
                <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full border border-white bg-blue-600" />
                <span className="absolute -bottom-1.5 -left-1.5 size-2 rounded-full border border-white bg-blue-600" />
                <span className="absolute -bottom-1.5 -right-1.5 size-2 rounded-full border border-white bg-blue-600" />
                <span className="text-xs font-bold text-blue-700">Frontend</span>
                <span className="capx-mono text-[9px] text-[var(--muted-ink)]">Next.js</span>
              </div>
              <span className="h-0.5 w-8 bg-neutral-300" aria-hidden="true" />
              <div className="capx-spring flex flex-col items-center rounded-2xl border border-emerald-300 bg-white p-3 shadow-sm">
                <span className="text-xs font-bold text-emerald-700">API</span>
                <span className="capx-mono text-[9px] text-[var(--muted-ink)]">Node.js</span>
              </div>
              <span className="h-0.5 w-8 bg-neutral-300" aria-hidden="true" />
              <div className="capx-spring flex flex-col items-center rounded-2xl border border-amber-300 bg-white p-3 shadow-sm">
                <span className="text-xs font-bold text-amber-700">Database</span>
                <span className="capx-mono text-[9px] text-[var(--muted-ink)]">PostgreSQL</span>
              </div>
            </div>

            {board.leaving.map((item) => renderElement(item, true))}
            {board.items.map((item) => renderElement(item))}

            {/* The canvas footer: how much room is left, and what just happened. */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-3">
              <p className="capx-hand max-w-[58%] text-sm leading-tight text-[var(--muted-ink)]" role="status">
                {board.notice || 'Visualize anything. Your canvas, your rules.'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="capx-slots"
                  role="img"
                  aria-label={`${board.items.length} of ${MAX_ITEMS} canvas slots used`}
                >
                  {Array.from({ length: MAX_ITEMS }, (_, index) => (
                    <span
                      key={index}
                      className={`capx-slot ${index < board.items.length ? 'is-filled' : ''} ${
                        index === 0 && board.items.length >= MAX_ITEMS ? 'is-next' : ''
                      }`}
                    />
                  ))}
                </span>
                <span className="capx-mono text-[9px] font-bold text-[var(--muted-ink)]">
                  {board.items.length}/{MAX_ITEMS}
                </span>
                {board.items.length > 0 && (
                  <button type="button" className="capx-clear" onClick={clearBoard}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="z-10 flex w-36 select-none flex-col gap-2 rounded-2xl border border-[var(--rule)] bg-white/95 p-3 shadow-md backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-ink)]">Emoji and Icons</span>
            <div className="grid grid-cols-3 gap-1.5">
              {ICON_TILES.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => addElement({ kind: 'icon', label: `${tile.label} icon`, Icon: tile.icon })}
                  className={`flex items-center justify-center rounded-lg p-1.5 transition-transform hover:scale-110 ${tile.tone}`}
                  aria-label={`Add ${tile.label} icon`}
                >
                  <tile.icon size={14} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1 text-[10px] text-[var(--muted-ink)]">
              <Search size={12} />
              <span>Click to spawn</span>
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function CopilotStage() {
  const [injected, setInjected] = useState(false);
  const [flash, setFlash] = useState(false);

  const inject = () => {
    setInjected(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 900);
  };

  return (
    <section id="cap-03" className="capx-reveal relative flex flex-col items-center justify-between gap-12 py-8 lg:flex-row">
      <div className="flex w-full flex-col items-start gap-4 lg:w-[42%]">
        <ChapterLabel number="03" label="AI helper & smart assistance" />
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-4xl lg:text-[46px]">
          Get AI guidance
          <br />
          <em className="capx-serif italic text-[var(--heading-accent)]">at every step.</em>
        </h2>
        <p className="text-base font-normal leading-relaxed text-[var(--muted-ink)]">
          Use the built-in AI Helper to refine your diagram, add new elements, improve structure, or explore the next steps in your project.
        </p>
        <Checklist
          items={[
            'Add or modify elements',
            'Improve architecture',
            'Suggest best practices',
            'Generate documentation',
            'Answer questions about your diagram',
          ]}
        />
      </div>

      <div className="relative flex w-full flex-col items-center gap-4 md:flex-row md:items-start lg:w-[56%]">
        <div className="capx-stage capx-canvas relative flex min-h-[350px] flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-[var(--rule)] bg-white p-5">
          <WindowBar title="Smart System Graph">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                injected ? 'bg-emerald-50 text-[var(--heading-accent)]' : 'bg-purple-50 text-purple-700'
              }`}
            >
              {injected ? 'Auth Injected ✓' : 'Copilot Active'}
            </span>
          </WindowBar>

          <div className="relative my-6 flex w-full items-center justify-between gap-1 px-1">
            <NodeCard title="Web App" Icon={Globe} tone="border-blue-200 text-blue-600" className="w-16" />

            <div
              className={`capx-spring capx-injected relative flex w-20 flex-col items-center gap-1.5 rounded-2xl border-2 border-purple-400 bg-purple-50 p-2.5 shadow-md ${
                injected ? 'is-in' : ''
              } ${flash ? 'is-flash' : ''}`}
            >
              <span className="absolute -top-2 rounded-full bg-purple-600 px-1 py-0.5 text-[8px] font-bold text-white">AI INJECTED</span>
              <Lock size={16} className="text-purple-600" />
              <span className="text-center text-[9.5px] font-bold leading-tight text-purple-950">Auth Service</span>
            </div>

            <NodeCard title="API" Icon={Network} tone="border-emerald-200 text-[var(--heading-accent)]" className="w-16" />

            <NodeCard title="AI Service" Icon={Box} tone="border-purple-200 text-purple-600" className="w-16" />
          </div>

          {/* The database hangs below the service layer. It sits in the normal
              flow rather than being pinned to the canvas, so it cannot drift
              over the nodes above it when the row reflows. */}
          <div className="-mt-3 flex flex-col items-center">
            <span className="h-8 w-0.5 bg-neutral-300" aria-hidden="true" />
            <NodeCard title="Database" Icon={Layers} tone="border-amber-200 text-amber-600" className="w-16" />
          </div>

          <div className="capx-mono pt-2 text-center text-[11px] text-[var(--muted-ink)]">
            AI RECOMMENDATION // SYNCHRONIZED
          </div>
        </div>

        {/* The note is anchored to the AI Helper panel it describes, so it
            points at the panel instead of floating over the diagram. */}
        <div className="relative w-full md:w-52">
          <HandNote className="bottom-full right-0 mb-2" tone="text-[var(--muted-ink)]">
            Refine.
            <br />
            Improve.
            <br />
            Iterate.
          </HandNote>

          <div className="capx-stage flex w-full flex-col gap-2.5 rounded-3xl border border-[var(--rule)] bg-white p-4">
            <WindowBar
              title="AI Helper"
              icon={
                <span className="ml-1 flex size-5 items-center justify-center rounded-md bg-purple-100 text-purple-600">
                  <Sparkles size={12} />
                </span>
              }
            />

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={inject}
              className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-2 text-left text-[11px] font-bold text-purple-900 transition-colors hover:bg-purple-100 active:scale-95"
            >
              <span>+ Add authentication</span>
              <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[9px] text-white">Apply</span>
            </button>
            {['Improve architecture', 'Suggest scalability', 'Add monitoring'].map((label) => (
              <button
                key={label}
                type="button"
                className="flex items-center justify-between rounded-xl border border-[var(--rule)] bg-neutral-50 p-2 text-left text-[11px] font-semibold text-[var(--muted-ink)] transition-colors hover:bg-neutral-100"
              >
                <span>{label}</span>
                <ArrowUpRight size={12} className="text-[var(--muted-ink)]" />
              </button>
            ))}
          </div>

          <div className="relative mt-1 flex items-center">
            <input
              type="text"
              placeholder="Ask anything..."
              className="w-full rounded-xl bg-neutral-100 py-1.5 pl-3 pr-8 text-[11px] text-[var(--ink)] outline-none focus:bg-white"
            />
            <button
              type="button"
              className="absolute right-1 flex size-5 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 active:scale-95"
            >
              <ArrowUpRight size={12} />
            </button>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 04 — collaborators
 * ------------------------------------------------------------------ */

function MultiplayerStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sarahRef = useRef<HTMLDivElement>(null);
  const alexRef = useRef<HTMLDivElement>(null);
  const youRef = useRef<HTMLDivElement>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replied, setReplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({ '🔥': 2, '👍': 3 });

  // Three cursors drift on slow, offset orbits.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t = 0;
    let frame = 0;
    const tick = () => {
      t += 0.03;
      if (sarahRef.current) {
        const x = 60 + Math.sin(t * 1.2) * 55;
        const y = 40 + Math.cos(t * 1.5) * 30;
        sarahRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (alexRef.current) {
        const x = -Math.cos(t * 1.1) * 60;
        const y = Math.sin(t * 0.9) * 35;
        alexRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (youRef.current) {
        const x = Math.sin(t * 1.4) * 45;
        const y = -Math.cos(t * 1.3) * 25;
        youRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/capabilities#cap-04`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="cap-04" className="capx-reveal relative flex flex-col items-center justify-between gap-12 py-8 lg:flex-row">
      <div className="flex w-full flex-col items-start gap-4 lg:w-[42%]">
        <ChapterLabel number="04" label="Real-time collaboration" />
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-4xl lg:text-[46px]">
          Build together,
          <br />
          <em className="capx-serif italic text-[var(--heading-accent)]">anywhere.</em>
        </h2>
        <p className="text-base font-normal leading-relaxed text-[var(--muted-ink)]">
          Invite your team, share your workspace, and collaborate in real time. Perfect for product teams, engineers, designers, and technical stakeholders.
        </p>
        <Checklist
          items={['Real-time collaboration', 'Comments and feedback', 'Keep everyone in sync']}
        />
      </div>

      <div className="relative flex w-full flex-col items-center gap-4 md:flex-row md:items-start lg:w-[56%]">
        <div className="relative flex-1">
        {/* Above the canvas, pointing down at the live cursors in its corner. */}
        <HandNote className="bottom-full left-0 mb-2" tone="text-[var(--muted-ink)]">
          Work together
          <br />
          in real time.
        </HandNote>

        <div ref={stageRef} className="capx-stage capx-canvas relative flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--rule)] bg-white p-5">
          <WindowBar title="Team Canvas" />

          <div ref={sarahRef} className="capx-cursor" style={{ top: 108, left: 40 }}>
            <svg className="size-5 fill-emerald-600 text-emerald-600 drop-shadow-md" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4l16 8-8 2-2 8z" />
            </svg>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">Sarah</span>
          </div>
          <div ref={alexRef} className="capx-cursor" style={{ top: 140, right: 110 }}>
            <svg className="size-5 fill-blue-600 text-blue-600 drop-shadow-md" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4l16 8-8 2-2 8z" />
            </svg>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">Alex</span>
          </div>
          <div ref={youRef} className="capx-cursor" style={{ bottom: 150, right: 50 }}>
            <svg className="size-5 fill-purple-600 text-purple-600 drop-shadow-md" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4l16 8-8 2-2 8z" />
            </svg>
            <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">You</span>
          </div>

          <div className="relative mx-auto mt-12 flex w-full max-w-[340px] items-center justify-between">
            <div className="capx-spring flex flex-col items-center rounded-xl border border-blue-300 bg-white p-2.5 shadow-sm">
              <span className="text-xs font-bold text-blue-700">Frontend</span>
            </div>
            <span className="h-0.5 w-8 bg-neutral-300" aria-hidden="true" />
            <div className="capx-spring flex flex-col items-center rounded-xl border border-emerald-300 bg-white p-2.5 shadow-sm">
              <span className="text-xs font-bold text-emerald-700">API</span>
            </div>
            <span className="h-0.5 w-8 bg-neutral-300" aria-hidden="true" />
            <div className="capx-spring flex flex-col items-center rounded-xl border border-purple-300 bg-white p-2.5 shadow-sm">
              <span className="text-xs font-bold text-purple-700">AI Service</span>
            </div>
          </div>

          <div className="capx-spring absolute bottom-6 left-6 z-20 max-w-[220px] rounded-2xl border border-[var(--rule)] bg-white p-3 shadow-float">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">S</span>
              <span className="text-xs font-bold text-[var(--ink)]">Sarah</span>
              <span className="text-[10px] text-[var(--muted-ink)]">2m ago</span>
            </div>
            <p className="text-[11px] font-medium leading-snug text-[var(--muted-ink)]">
              This looks great! Should we add a cache layer?
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--rule)] pt-1">
              <div className="flex items-center gap-1">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setReactions((current) => ({ ...current, [emoji]: (current[emoji] ?? 0) + 1 }))}
                    className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] transition-colors hover:bg-neutral-200"
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setReplyOpen((open) => !open)}
                className="text-[10px] font-bold text-blue-600 transition-colors hover:text-blue-800"
              >
                {replied ? 'Replied ✓' : 'Reply'}
              </button>
            </div>
            {replyOpen && !replied && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Write reply..."
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.currentTarget.value.trim() !== '') {
                      setReplied(true);
                      setReplyOpen(false);
                    }
                  }}
                  className="w-full rounded-md border border-[var(--rule)] bg-neutral-100 px-2 py-1 text-[10px] outline-none"
                />
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="capx-stage flex w-full flex-col gap-3 rounded-3xl border border-[var(--rule)] bg-white p-4 md:w-52">
          <WindowBar title="Share workspace">
            <X size={14} className="text-[var(--muted-ink)]" />
          </WindowBar>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              defaultValue="team@scribeboard.com"
              className="w-full rounded-xl border border-transparent bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-[var(--ink)]"
            />
            <button type="button" className="w-full rounded-xl bg-neutral-900 py-1.5 text-xs font-bold text-white transition-colors hover:bg-neutral-800 active:scale-95">
              Invite
            </button>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-[var(--rule)] pt-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-[var(--muted-ink)]">
              <span>Anyone with the link</span>
              <span className="font-bold text-[var(--muted-ink)]">Can view ▾</span>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-neutral-100 py-1.5 text-xs font-bold text-[var(--ink)] transition-colors hover:bg-neutral-200 active:scale-95"
            >
              <Link2 size={12} />
              <span>{copied ? 'Link Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 05 — export
 * ------------------------------------------------------------------ */

const EXPORT_OPTIONS = [
  { type: 'PNG', label: 'Export as PNG', Icon: ImageIcon, tone: 'text-blue-600' },
  { type: 'PDF', label: 'Export as PDF', Icon: FileText, tone: 'text-red-600' },
  { type: 'SVG', label: 'Export as SVG', Icon: Square, tone: 'text-emerald-600' },
];

function ExportStage() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [status, setStatus] = useState('');

  const exportAs = (type: string) => {
    setMenuOpen(false);
    setStatus(`✓ Exported diagram as ${type} to Downloads`);
    window.setTimeout(() => setStatus(''), 2200);
  };

  return (
    <section id="cap-05" className="capx-reveal relative flex flex-col items-center justify-between gap-12 py-8 lg:flex-row">
      <div className="flex w-full flex-col items-start gap-4 lg:w-[42%]">
        <ChapterLabel number="05" label="Export, share & integrate" />
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-4xl lg:text-[46px]">
          Take it further.
        </h2>
        <p className="text-base font-normal leading-relaxed text-[var(--muted-ink)]">
          Save, export, and integrate your diagrams into your workflow. Keep building and sharing across tools.
        </p>
        <Checklist
          items={[
            'Save to workspace',
            'Share with a link',
            'Export as PNG, PDF, SVG',
            'Use in docs and presentations',
            'Integrate with your favorite tools',
          ]}
        />
      </div>

      <div className="relative flex w-full flex-col items-center gap-4 md:flex-row md:items-start lg:w-[56%]">
        <div className="capx-stage capx-canvas relative flex min-h-[340px] flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-[var(--rule)] bg-white p-5">
          <WindowBar title="Exporter">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-md border border-[var(--rule)] bg-white px-2 py-1 text-[11px] font-bold text-[var(--ink)]">
                <Save size={12} className="text-blue-600" /> Save
              </span>
              <span className="flex items-center gap-1 rounded-md border border-[var(--rule)] bg-white px-2 py-1 text-[11px] font-bold text-[var(--ink)]">
                <Share size={12} className="text-emerald-600" /> Share
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                <Download size={12} /> Export
              </button>
            </div>
          </WindowBar>

          {menuOpen && (
            <div className="capx-spring capx-float absolute right-4 top-14 z-30 flex flex-col gap-1.5 rounded-2xl border border-[var(--rule)] bg-white/95 p-2.5 backdrop-blur-md">
              {EXPORT_OPTIONS.map(({ type, label, Icon, tone }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => exportAs(type)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-neutral-100"
                >
                  <Icon size={14} className={tone} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Pushed clear of the export dropdown, which hangs from the Export
              button and would otherwise cover it. */}
          <div className="relative mx-auto mt-10 mb-4 flex w-full max-w-[320px] items-center justify-between opacity-80">
            <span className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-[10px] font-bold text-blue-900">Web App</span>
            <span className="h-0.5 w-6 bg-neutral-300" aria-hidden="true" />
            <span className="rounded-xl border border-purple-200 bg-purple-50 p-2 text-[10px] font-bold text-purple-900">Auth</span>
            <span className="h-0.5 w-6 bg-neutral-300" aria-hidden="true" />
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-900">API</span>
          </div>

          <div
            className={`rounded-xl border border-emerald-200 bg-emerald-50 py-1.5 text-center text-xs font-bold text-emerald-700 transition-opacity ${
              status ? 'opacity-100' : 'opacity-0'
            }`}
            role="status"
          >
            {status || '✓ Exported successfully to Downloads'}
          </div>
        </div>

        {/* Anchored to the Integrations panel it describes, so the arrow points
            at the panel rather than across the diagram. */}
        <div className="relative w-full md:w-52">
          <HandNote className="bottom-full right-0 mb-2" tone="text-[var(--muted-ink)]">
            Share
            <br />
            your ideas
            <br />
            anywhere.
          </HandNote>

          <div className="capx-stage flex w-full flex-col gap-3 rounded-3xl border border-[var(--rule)] bg-white p-4">
            <WindowBar title="Integrations" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { mark: 'N', name: 'Notion', tone: 'text-[var(--ink)]' },
                { mark: '※', name: 'Confluence', tone: 'text-blue-600' },
                { mark: '#', name: 'Slack', tone: 'text-emerald-600' },
              ].map((tile) => (
                <div
                  key={tile.name}
                  className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-[var(--rule)] bg-neutral-50 p-2.5 transition-all hover:scale-105 hover:bg-neutral-100 active:scale-95"
                >
                  <span className={`text-xs font-extrabold ${tile.tone}`}>{tile.mark}</span>
                  <span className="text-[9px] font-semibold text-[var(--muted-ink)]">{tile.name}</span>
                </div>
              ))}
            </div>
            <div className="cursor-pointer rounded-xl bg-neutral-100 p-2 text-center text-xs font-bold text-[var(--muted-ink)] transition-colors hover:text-[var(--ink)]">
              More integrations...
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

export default function CapabilitiesShowcase() {
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLElement>(null);

  // Progress bar. The chapter controller that used to sit alongside this is
  // gone, so the scroll handler only has to track reading position.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Section reveals.
  //
  // The observer writes the class straight to the DOM instead of routing
  // through React state. The reveal is a one-way, fire-and-forget transition:
  // once a section has appeared it never needs to change again, and keeping it
  // out of React's state means a scroll-driven re-render cannot clobber it.
  //
  // Three rules keep this safe:
  //   - anything already on screen is revealed immediately, so the first
  //     screen never waits on the observer;
  //   - only sections below the fold are hidden in the first place, so the
  //     page is never blank;
  //   - a timeout reveals everything if the observer never reports, which
  //     happens in browsers that throttle observers in background tabs.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll('.capx-reveal'));

    if (!('IntersectionObserver' in window)) {
      sections.forEach((element) => element.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );

    sections.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add('is-in');
        return;
      }
      element.classList.add('is-armed');
      observer.observe(element);
    });

    const failsafe = window.setTimeout(() => {
      sections.forEach((element) => element.classList.add('is-in'));
      observer.disconnect();
    }, 4000);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <main className="capabilities-showcase" ref={rootRef}>
      <div className="capx-progress" style={{ width: `${progress}%` }} aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-28 px-6 pt-10 pb-20">
        {/* ---- Hero ---- */}
        <section id="hero" className="capx-reveal relative flex flex-col items-center justify-between gap-12 pt-6 pb-6 lg:flex-row">
          <div className="flex w-full flex-col items-start gap-6 lg:w-[45%]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-ink)]">
              <span className="size-[7px] rounded-full bg-[var(--signal)]" />
              <span>Capabilities</span>
            </div>

            <h1 className="text-4xl font-semibold leading-[0.92] tracking-[-0.05em] text-[var(--ink)] sm:text-5xl lg:text-[64px]">
              Turn complex
              <br />
              ideas into
              <br />
              <em className="capx-serif italic text-[var(--heading-accent)]">clear diagrams.</em>
            </h1>

            <p className="max-w-md text-base font-normal leading-relaxed text-[var(--muted-ink)] sm:text-lg">
              <strong className="font-bold text-[var(--ink)]">Everything</strong> you need to think, visualize, collaborate, and build — on an infinite canvas.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link href="/dashboard" className="button button-dark">
                Start creating <ArrowRight size={16} />
              </Link>
              <a href="#cap-01" className="button">
                Explore all features <ArrowDown size={14} />
              </a>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {[
                  ['M', 'bg-emerald-100 text-emerald-800'],
                  ['A', 'bg-blue-100 text-blue-800'],
                  ['P', 'bg-purple-100 text-purple-800'],
                ].map(([initial, tone]) => (
                  <span key={initial} className={`flex size-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-2xs ${tone}`}>
                    {initial}
                  </span>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--muted-ink)]">Trusted by builders, teams and creators</span>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <span>★★★★★</span>
                  <span className="ml-1 font-bold text-[var(--ink)]">4.9/5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full lg:w-[55%]">
            <HeroStage />
          </div>
        </section>

        <GenerateStage />
        <CanvasStage />
        <CopilotStage />
        <MultiplayerStage />
        <ExportStage />

        {/* ---- Closing hub ---- */}
        <ClosingHub />
      </div>
    </main>
  );
}
