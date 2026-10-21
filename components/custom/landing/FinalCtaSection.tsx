'use client';

import Link from 'next/link';
import { Caveat } from 'next/font/google';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CircleDot,
  Code2,
  FileText,
  GitBranch,
  Layers,
  Link2,
  MousePointer2,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Type,
  Workflow,
  Zap,
} from '@/lib/icons';

type SpringState = { x: number; y: number; vx: number; vy: number };
type SpringConfig = { stiffness: number; damping: number; mass: number };
type CardId = 'plan' | 'architecture' | 'whiteboard';
type SoundCue = 'grab' | 'release';
type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const CARD_IDS: CardId[] = ['plan', 'architecture', 'whiteboard'];
const handwriting = Caveat({ subsets: ['latin'], weight: '500', display: 'swap', variable: '--final-handwriting' });
const CARD_LABELS: Record<CardId, string> = {
  plan: 'Plan / Flow',
  architecture: 'Architecture',
  whiteboard: 'Whiteboard',
};

const CANVAS_TOOLS = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'shape', label: 'Shape', Icon: Square },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'branch', label: 'Branch', Icon: GitBranch },
] as const;

function advanceSpring(state: SpringState, config: SpringConfig, elapsed: number): SpringState {
  const next = { ...state };
  const duration = Math.min(Math.max(elapsed, 0), 0.05);
  const steps = Math.max(1, Math.ceil(duration / (1 / 120)));
  const dt = duration / steps;

  for (let index = 0; index < steps; index += 1) {
    next.vx += ((-config.stiffness * next.x) - (config.damping * next.vx)) / config.mass * dt;
    next.vy += ((-config.stiffness * next.y) - (config.damping * next.vy)) / config.mass * dt;
    next.x += next.vx * dt;
    next.y += next.vy * dt;
  }

  return next;
}

function springIsSettled(state: SpringState) {
  return Math.abs(state.x) < 0.2 && Math.abs(state.y) < 0.2 && Math.abs(state.vx) < 0.2 && Math.abs(state.vy) < 0.2;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

type DragSurfaceProps = {
  children: ReactNode;
  className?: string;
  label: string;
  baseTransform?: string;
  style?: CSSProperties;
  reducedMotion: boolean;
  stiffness?: number;
  damping?: number;
  onActivate?: () => void;
  playSound?: (cue: SoundCue) => void;
};

/** A small pointer + keyboard draggable surface that always springs home. */
function DragSurface({
  children,
  className = '',
  label,
  baseTransform = 'translateZ(0)',
  style,
  reducedMotion,
  stiffness = 250,
  damping = 24,
  onActivate,
  playSound,
}: DragSurfaceProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startClientX: number;
    startClientY: number;
    lastTime: number;
    moved: boolean;
  } | null>(null);
  const stateRef = useRef<SpringState>({ x: 0, y: 0, vx: 0, vy: 0 });
  const suppressClickRef = useRef(false);
  const config = { stiffness, damping, mass: 1 };

  const paint = useCallback((held = false, springing = false) => {
    const element = elementRef.current;
    if (!element) return;
    element.style.setProperty('--surface-drag-x', `${stateRef.current.x}px`);
    element.style.setProperty('--surface-drag-y', `${stateRef.current.y}px`);
    element.dataset.held = String(held);
    element.dataset.springing = String(springing);
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const returnToOrigin = useCallback(() => {
    cancelAnimation();

    if (reducedMotion) {
      stateRef.current = { x: 0, y: 0, vx: 0, vy: 0 };
      paint(false, false);
      return;
    }

    paint(false, true);
    let lastTime = performance.now();
    const tick = (time: number) => {
      stateRef.current = advanceSpring(stateRef.current, config, (time - lastTime) / 1000);
      lastTime = time;

      if (springIsSettled(stateRef.current)) {
        stateRef.current = { x: 0, y: 0, vx: 0, vy: 0 };
        animationRef.current = null;
        paint(false, false);
        return;
      }

      paint(false, true);
      animationRef.current = window.requestAnimationFrame(tick);
    };
    animationRef.current = window.requestAnimationFrame(tick);
  }, [cancelAnimation, config, paint, reducedMotion]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  useEffect(() => {
    if (!reducedMotion) return;
    cancelAnimation();
    stateRef.current = { x: 0, y: 0, vx: 0, vy: 0 };
    paint(false, false);
  }, [cancelAnimation, paint, reducedMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, [data-no-drag="true"]')) return;

    event.stopPropagation();
    event.preventDefault();
    cancelAnimation();
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX - stateRef.current.x,
      originY: event.clientY - stateRef.current.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastTime: performance.now(),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    paint(true, false);
    playSound?.('grab');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const now = performance.now();
    const delta = Math.max(1 / 120, (now - drag.lastTime) / 1000);
    const x = Math.max(-180, Math.min(180, event.clientX - drag.originX));
    const y = Math.max(-180, Math.min(180, event.clientY - drag.originY));
    const previous = stateRef.current;
    drag.moved ||= Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) > 4;
    stateRef.current = {
      x,
      y,
      vx: Math.max(-560, Math.min(560, ((x - previous.x) / delta) * 0.4)),
      vy: Math.max(-560, Math.min(560, ((y - previous.y) / delta) * 0.4)),
    };
    drag.lastTime = now;
    paint(true, false);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    suppressClickRef.current = drag.moved || event.type !== 'pointerup';
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    playSound?.('release');
    returnToOrigin();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || dragRef.current) return;
    const nudges: Record<string, [number, number]> = {
      ArrowLeft: [-24, 0],
      ArrowRight: [24, 0],
      ArrowUp: [0, -24],
      ArrowDown: [0, 24],
    };
    const nudge = nudges[event.key];
    if (nudge) {
      event.preventDefault();
      cancelAnimation();
      stateRef.current = { x: nudge[0], y: nudge[1], vx: 0, vy: 0 };
      playSound?.('grab');
      returnToOrigin();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      returnToOrigin();
    }
  };

  return (
    <div
      ref={elementRef}
      className={`final-cta__drag-surface ${className}`}
      style={{ '--surface-base': baseTransform, ...style } as CSSProperties}
      role="group"
      tabIndex={0}
      aria-label={`${label}. Drag to move, or use arrow keys to nudge.`}
      data-drag-surface="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => event.preventDefault()}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onActivate?.();
      }}
    >
      {children}
    </div>
  );
}

function WindowChrome({ id, badge }: { id: CardId; badge: string }) {
  const isWhiteboard = id === 'whiteboard';

  return (
    <div className={`final-cta__window-bar${isWhiteboard ? ' final-cta__window-bar--whiteboard' : ''}`}>
      <span className="final-cta__traffic-lights" aria-hidden="true"><i /><i /><i /></span>
      <span className="final-cta__window-title">{isWhiteboard ? 'Whiteboard & Ideation' : id === 'plan' ? 'Plan / Flow' : 'Architecture'}</span>
      <span className={`final-cta__window-badge${isWhiteboard ? ' final-cta__window-badge--whiteboard' : ''}`}>{badge}</span>
    </div>
  );
}

function MiniNode({
  children,
  className = '',
  label,
  reducedMotion,
  playSound,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  reducedMotion: boolean;
  playSound: (cue: SoundCue) => void;
}) {
  return (
    <DragSurface
      label={`${label} component`}
      className={`final-cta__mini-node ${className}`}
      baseTransform="translateZ(18px)"
      reducedMotion={reducedMotion}
      stiffness={320}
      damping={26}
      playSound={playSound}
    >
      {children}
    </DragSurface>
  );
}

function PlanFlowCanvas({ reducedMotion, playSound }: { reducedMotion: boolean; playSound: (cue: SoundCue) => void }) {
  return (
    <div className="final-cta__canvas-body final-cta__plan-body">
      <svg className="final-cta__wire-map" viewBox="0 0 480 250" preserveAspectRatio="none" aria-hidden="true">
        <path d="M240 52C240 86 122 82 122 126M240 52C240 88 354 86 354 126M122 158C122 195 240 180 240 214M354 158C354 195 240 180 240 214" />
      </svg>
      <span className="final-cta__plan-kicker">A small idea, mapped clearly</span>
      <MiniNode label="Idea" className="final-cta__plan-node--spark" reducedMotion={reducedMotion} playSound={playSound}><Sparkles size={14} /><strong>Idea</strong></MiniNode>
      <MiniNode label="Design" className="final-cta__plan-node--shape" reducedMotion={reducedMotion} playSound={playSound}><Box size={14} /><strong>Design</strong></MiniNode>
      <MiniNode label="Plan" className="final-cta__plan-node--flow" reducedMotion={reducedMotion} playSound={playSound}><FileText size={14} /><strong>Plan</strong></MiniNode>
      <MiniNode label="Build" className="final-cta__plan-node--ship" reducedMotion={reducedMotion} playSound={playSound}><Code2 size={14} /><strong>Build</strong></MiniNode>
      <span className="final-cta__canvas-note final-cta__canvas-note--plan">clear next step <ArrowUpRight size={12} /></span>
    </div>
  );
}

function ArchitectureCanvas({ reducedMotion, playSound }: { reducedMotion: boolean; playSound: (cue: SoundCue) => void }) {
  return (
    <div className="final-cta__canvas-body final-cta__architecture-body">
      <span className="final-cta__plan-kicker">A system everyone can enter</span>
      <svg className="final-cta__wire-map" viewBox="0 0 480 250" preserveAspectRatio="none" aria-hidden="true">
        <path d="M240 66V100M240 130V162M120 182H360M120 182V212M240 182V212M360 182V212" />
      </svg>
      <MiniNode label="Client" className="final-cta__arch-node--client" reducedMotion={reducedMotion} playSound={playSound}><Code2 size={14} /><strong>Client</strong></MiniNode>
      <MiniNode label="API" className="final-cta__arch-node--api" reducedMotion={reducedMotion} playSound={playSound}><Link2 size={14} /><strong>API layer</strong></MiniNode>
      <MiniNode label="Services" className="final-cta__arch-node--services" reducedMotion={reducedMotion} playSound={playSound}><Network size={14} /><strong>Services</strong></MiniNode>
      <MiniNode label="Data" className="final-cta__arch-node--data" reducedMotion={reducedMotion} playSound={playSound}><CircleDot size={14} /><strong>Data</strong></MiniNode>
      <MiniNode label="Events" className="final-cta__arch-node--events" reducedMotion={reducedMotion} playSound={playSound}><Zap size={14} /><strong>Events</strong></MiniNode>
      <MiniNode label="Docs" className="final-cta__arch-node--docs" reducedMotion={reducedMotion} playSound={playSound}><FileText size={14} /><strong>Docs</strong></MiniNode>
    </div>
  );
}

function WhiteboardCanvas({ reducedMotion, playSound }: { reducedMotion: boolean; playSound: (cue: SoundCue) => void }) {
  return (
    <div className="final-cta__canvas-body final-cta__whiteboard-body">
      <MiniNode label="Core MVP loop" className="final-cta__white-node--question" reducedMotion={reducedMotion} playSound={playSound}>
        <span className="final-cta__white-note-label">#1 CORE MVP LOOP</span>
        <span className="final-cta__white-note-script">Sync directly with<br />GitHub PRs &amp; specs!</span>
      </MiniNode>
      <MiniNode label="User journey" className="final-cta__white-node--insight" reducedMotion={reducedMotion} playSound={playSound}>
        <span className="final-cta__white-journey-title">~ The User Journey ~</span>
        <span className="final-cta__white-journey-copy">Draft → Visual → Handoff</span>
      </MiniNode>
      <svg className="final-cta__whiteboard-arrow" viewBox="0 0 420 190" preserveAspectRatio="none" aria-hidden="true"><path d="M95 92 C175 126 275 126 350 78" /><path d="M334 70 L350 78 L337 88" /></svg>
      <MiniNode label="Approved spec" className="final-cta__white-node--decision" reducedMotion={reducedMotion} playSound={playSound}>
        <span className="final-cta__white-approved"><Check size={12} strokeWidth={3} /> APPROVED SPEC v2</span>
        <span className="final-cta__white-approved-copy">Zero sync delays. Instant<br />graph rendering.</span>
      </MiniNode>
      <MiniNode label="Freehand canvas" className="final-cta__white-node--next" reducedMotion={reducedMotion} playSound={playSound}><Sparkles size={15} /><strong>Freehand Canvas</strong></MiniNode>
    </div>
  );
}

function CanvasCard({
  id,
  reducedMotion,
  activeTool,
  onToolChange,
  playSound,
  showToolbar,
}: {
  id: CardId;
  reducedMotion: boolean;
  activeTool: string;
  onToolChange: (tool: string) => void;
  playSound: (cue: SoundCue) => void;
  showToolbar: boolean;
}) {
  const statusLabel = id === 'plan' ? 'ACTIVE: PLAN & FLOW' : id === 'architecture' ? 'ACTIVE: ARCHITECTURE' : 'MODE: FREEHAND WHITEBOARD';
  const canvasLabel = id === 'whiteboard' ? 'CANVAS / BOARD-03' : 'CANVAS / SCRIBE-01';
  const badge = id === 'plan' ? '01 / PLAN & FLOW' : id === 'architecture' ? '02 / ARCHITECTURE' : '03 / WHITEBOARD';

  return (
    <div className="final-cta__canvas-card">
      <WindowChrome id={id} badge={badge} />
      {id === 'plan' ? <PlanFlowCanvas reducedMotion={reducedMotion} playSound={playSound} /> : null}
      {id === 'architecture' ? <ArchitectureCanvas reducedMotion={reducedMotion} playSound={playSound} /> : null}
      {id === 'whiteboard' ? <WhiteboardCanvas reducedMotion={reducedMotion} playSound={playSound} /> : null}
      {showToolbar ? <div className="final-cta__canvas-toolbar" role="toolbar" aria-label={`${CARD_LABELS[id]} tools`} data-no-drag="true" onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
        {CANVAS_TOOLS.map(({ id: toolId, label, Icon }) => <button key={toolId} type="button" aria-label={label} aria-pressed={activeTool === toolId} className={activeTool === toolId ? 'is-active' : ''} data-no-drag="true" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onToolChange(toolId); playSound('grab'); }}><Icon size={15} aria-hidden="true" /></button>)}
        <span className="final-cta__canvas-tool-divider" />
        <button type="button" aria-label="Add canvas component" data-no-drag="true" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onToolChange('add'); playSound('grab'); }}><Plus size={15} aria-hidden="true" /></button>
      </div> : null}
      <div className={`final-cta__canvas-status${id === 'whiteboard' ? ' final-cta__canvas-status--whiteboard' : ''}`}><span>{canvasLabel}</span><span className="final-cta__canvas-status-active"><i /> {statusLabel}</span></div>
    </div>
  );
}

function AssistantSatellite({ reducedMotion, onPreview, playSound }: { reducedMotion: boolean; onPreview: () => void; playSound: (cue: SoundCue) => void }) {
  return (
    <DragSurface
      label="AI Assistant satellite card"
      className="final-cta__satellite final-cta__assistant-card"
      baseTransform="translate3d(0, 0, 42px) rotateZ(-4deg)"
      reducedMotion={reducedMotion}
      stiffness={230}
      damping={22}
      playSound={playSound}
    >
      <div className="final-cta__satellite-head"><span className="final-cta__assistant-icon"><Sparkles size={14} /></span><strong>AI Assistant</strong><span className="final-cta__satellite-menu">•••</span></div>
      <p>Turn the loose thought into<br />a system your team can use.</p>
      <div className="final-cta__assistant-footer"><span><Zap size={11} /> Generate</span><button type="button" onClick={onPreview} aria-label="Preview AI Assistant result"><ArrowUpRight size={15} /></button></div>
    </DragSurface>
  );
}

function SystemSatellite({ reducedMotion, playSound }: { reducedMotion: boolean; playSound: (cue: SoundCue) => void }) {
  return (
    <DragSurface
      label="A clear system satellite card"
      className="final-cta__satellite final-cta__system-card"
      baseTransform="translate3d(0, 0, 55px) rotateZ(3deg)"
      reducedMotion={reducedMotion}
      stiffness={240}
      damping={23}
      playSound={playSound}
    >
      <div className="final-cta__satellite-head"><span className="final-cta__check-icon"><Check size={12} strokeWidth={3} /></span><strong>A clear system</strong></div>
      <div className="final-cta__system-map" aria-hidden="true"><span className="final-cta__system-root">core</span><i /><div><b /><b /><b /></div></div>
      <span className="final-cta__system-caption">ready to share</span>
    </DragSurface>
  );
}

export function FinalCtaSection() {
  const reducedMotion = useReducedMotion();
  const audioRef = useRef<AudioContext | null>(null);
  const [order, setOrder] = useState<CardId[]>(CARD_IDS);
  const [activeId, setActiveId] = useState<CardId>('plan');
  const [watching, setWatching] = useState(false);
  const [activeTool, setActiveTool] = useState('select');

  const playSound = useCallback((cue: SoundCue) => {
    try {
      const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!Constructor) return;
      const context = audioRef.current ?? new Constructor();
      audioRef.current = context;
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const isGrab = cue === 'grab';
      oscillator.type = isGrab ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(isGrab ? 320 : 540, now);
      oscillator.frequency.exponentialRampToValueAtTime(isGrab ? 580 : 260, now + (isGrab ? 0.06 : 0.15));
      gain.gain.setValueAtTime(isGrab ? 0.08 : 0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isGrab ? 0.08 : 0.18));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now);
      oscillator.stop(now + (isGrab ? 0.08 : 0.18));
    } catch {
      // Audio is decorative; device restrictions must never block the canvas.
    }
  }, []);

  useEffect(() => () => {
    const context = audioRef.current;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }, []);

  const bringToFront = useCallback((id: CardId) => {
    setActiveId(id);
    setOrder((current) => [id, ...current.filter((cardId) => cardId !== id)]);
  }, []);

  const shuffleDeck = useCallback(() => {
    setOrder((current) => {
      const next = [current[current.length - 1], ...current.slice(0, -1)];
      setActiveId(next[0]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!watching || reducedMotion) return;
    const timer = window.setInterval(() => {
      setOrder((current) => {
        const next = [current[current.length - 1], ...current.slice(0, -1)];
        setActiveId(next[0]);
        return next;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, watching]);

  const selectMode = (id: CardId) => {
    playSound('release');
    bringToFront(id);
  };
  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextId = CARD_IDS[event.key === 'Home' ? 0 : CARD_IDS.length - 1];
      playSound('release');
      selectMode(nextId);
      return;
    }
    if (!direction) return;
    event.preventDefault();
    const nextIndex = (index + direction + CARD_IDS.length) % CARD_IDS.length;
    playSound('release');
    selectMode(CARD_IDS[nextIndex]);
  };

  return (
    <section className={`final-cta ${handwriting.variable}`} id="final-cta" aria-labelledby="final-cta-title" data-reduced-motion={reducedMotion}>
      <div className="final-cta__grain" aria-hidden="true" />
      <div className="final-cta__main">
        <div className="final-cta__copy">
          <p className="final-cta__eyebrow"><span />The last mile of an idea</p>
          <h2 id="final-cta-title">Your ideas deserve<br /><em>a clearer home.</em></h2>
          <p className="final-cta__description">Bring the fragments, questions and half-formed thoughts. ScribeBoard gives them a place to connect, take shape and move forward.</p>
          <div className="final-cta__actions">
            <Link href="/dashboard" className="final-cta__launch">Launch ScribeBoard <ArrowRight size={16} aria-hidden="true" /></Link>
            <button type="button" className="final-cta__watch" aria-pressed={watching} onClick={() => setWatching((current) => !current)}><span>{watching ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}</span>{watching ? 'Pause preview' : 'Watch 1 min'}</button>
          </div>
          <p className="final-cta__sign-in">Already have a workspace? <Link href="/sign-in">Sign in <ArrowUpRight size={12} aria-hidden="true" /></Link></p>

          <div className="final-cta__proof" aria-label="ScribeBoard community metrics">
            <div className="final-cta__avatars" aria-hidden="true"><span>AL</span><span>MK</span><span>JR</span><span>+</span></div>
            <p><strong>10K+</strong> thinkers are turning their next idea into something real.</p>
          </div>
          <div className="final-cta__metrics">
            <div><strong>4.9/5</strong><span>clarity rating</span></div>
            <div><strong>2.6×</strong><span>faster alignment</span></div>
            <div><strong>∞</strong><span>room to think</span></div>
          </div>
        </div>

        <div className="final-cta__visual">
          <div className="final-cta__visual-heading"><span>Interactive workspace</span><span><i /> drag to explore</span></div>
          <div className="final-cta__mode-tabs" role="tablist" aria-label="Canvas modes">
            {CARD_IDS.map((id, index) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeId === id}
                aria-controls={`final-cta-panel-${id}`}
                tabIndex={activeId === id ? 0 : -1}
                className={activeId === id ? 'is-active' : ''}
                onClick={() => selectMode(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {id === 'plan' ? <Workflow size={13} aria-hidden="true" /> : id === 'architecture' ? <Network size={13} aria-hidden="true" /> : <Layers size={13} aria-hidden="true" />}
                {CARD_LABELS[id]}
              </button>
            ))}
            <button type="button" className="final-cta__shuffle" onClick={() => { playSound('grab'); shuffleDeck(); }} aria-label="Shuffle canvas deck" title="Shuffle canvas deck"><RotateCcw size={14} aria-hidden="true" /></button>
          </div>

          <div className="final-cta__stage">
            <div className="final-cta__orbit orbit-one" aria-hidden="true" />
            <div className="final-cta__orbit orbit-two" aria-hidden="true" />
            <div className="final-cta__stage-mark stage-mark-one" aria-hidden="true">+</div>
            <div className="final-cta__stage-mark stage-mark-two" aria-hidden="true">·</div>
            <div className="final-cta__deck" aria-label="Three interactive canvas cards">
              {order.map((id, index) => (
                <DragSurface
                  key={id}
                  label={`${CARD_LABELS[id]} canvas`}
                  className={`final-cta__deck-card final-cta__deck-card--${id} final-cta__deck-card--depth-${index}`}
                  baseTransform={`translate3d(${index === 0 ? 0 : index === 1 ? -54 : -100}px, ${index === 0 ? 4 : index === 1 ? -18 : -34}px, ${index === 0 ? 0 : index === 1 ? -34 : -62}px) rotateZ(${index === 0 ? '1.5deg' : index === 1 ? '-6deg' : '-10deg'}) rotateX(${index === 0 ? '2deg' : '4deg'})`}
                  reducedMotion={reducedMotion}
                  style={{ zIndex: order.length - index }}
                  playSound={playSound}
                >
                  <div id={`final-cta-panel-${id}`} role="tabpanel" aria-label={`${CARD_LABELS[id]} canvas preview`} className="final-cta__panel-content"><CanvasCard id={id} reducedMotion={reducedMotion} activeTool={activeTool} onToolChange={setActiveTool} playSound={playSound} showToolbar={index === 0} /></div>
                </DragSurface>
              ))}
            </div>
            <AssistantSatellite reducedMotion={reducedMotion} playSound={playSound} onPreview={() => { playSound('release'); bringToFront('architecture'); }} />
            <SystemSatellite reducedMotion={reducedMotion} playSound={playSound} />
          </div>
          <p className="final-cta__visual-caption"><span>Tip</span> Every card and component can move. It always finds its way back.</p>
        </div>
      </div>

      <footer className="final-cta__footer"><span><i /> Live workspace ready</span><span>3 canvases in orbit · components are draggable</span><span>© 2026 ScribeBoard</span></footer>
      <p className="final-cta__sr-only" role="status">{watching ? 'Canvas preview is playing. The front canvas changes every three seconds.' : 'Canvas preview paused. Drag any card or component to explore, or use arrow keys when focused.'}</p>

      <style>{`
        .final-cta {
          --cta-paper: var(--landing-background, #faf9f6);
          --cta-ink: #16201b;
          --cta-muted: #67716b;
          --cta-line: #dfe3d9;
          --cta-green: var(--heading-accent, #065f46);
          --cta-mint: #d7eee0;
          position: relative;
          isolation: isolate;
          width: 100%;
          overflow: hidden;
          background: var(--cta-paper);
          color: var(--cta-ink);
          font-family: var(--font-sans, ui-sans-serif), system-ui, sans-serif;
        }
        .final-cta__grain { position: absolute; inset: 0; z-index: -1; opacity: .28; pointer-events: none; background-image: radial-gradient(circle at 15% 12%, rgb(255 255 255 / .8), transparent 29%), radial-gradient(circle at 86% 36%, rgb(227 241 226 / .5), transparent 32%); }
        .final-cta__main { position: relative; display: grid; width: min(100% - 64px, 1440px); min-height: 720px; grid-template-columns: minmax(300px, .78fr) minmax(600px, 1.22fr); align-items: center; gap: clamp(45px, 8vw, 130px); margin-inline: auto; padding: 58px 0 72px; }
        .final-cta__copy { position: relative; z-index: 2; max-width: 510px; }
        .final-cta__eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 20px; color: #718078; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 700; letter-spacing: .17em; text-transform: uppercase; }
        .final-cta__eyebrow > span { width: 7px; height: 7px; border-radius: 50%; background: #43ad77; box-shadow: 0 0 0 4px rgb(67 173 119 / .12); }
        .final-cta h2 { margin: 0; color: #122019; font-size: clamp(47px, 5.15vw, 78px); font-weight: 760; letter-spacing: -.07em; line-height: .98; }
        .final-cta h2 em { display: inline-block; color: var(--cta-green); font-family: Georgia, 'Times New Roman', serif; font-size: 1.03em; font-style: italic; font-weight: 400; letter-spacing: -.065em; }
        .final-cta__description { max-width: 405px; margin: 27px 0 30px; color: var(--cta-muted); font-size: 15px; line-height: 1.7; }
        .final-cta__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 15px; }
        .final-cta__launch { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 12px; border-radius: 999px; padding: 0 23px; background: #15201a; color: #fff; font-size: 12px; font-weight: 750; letter-spacing: -.01em; text-decoration: none; box-shadow: 0 14px 24px -14px rgb(22 32 27 / .7); transition: background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
        .final-cta__launch:hover { background: var(--cta-green); box-shadow: 0 18px 30px -15px rgb(20 123 81 / .65); transform: translateY(-2px); }
        .final-cta__watch { display: inline-flex; min-height: 44px; align-items: center; gap: 10px; border: 0; border-radius: 999px; padding: 3px 12px 3px 3px; background: transparent; color: #28352d; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
        .final-cta__watch:hover { background: rgb(255 255 255 / .58); }
        .final-cta__watch > span { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid #add7bb; border-radius: 50%; background: #e2f3e7; color: #147b51; }
        .final-cta__sign-in { margin: 14px 0 0 4px; color: #849089; font-size: 11px; }
        .final-cta__sign-in a { display: inline-flex; align-items: center; gap: 3px; color: #27724f; font-weight: 750; text-decoration: none; }
        .final-cta__sign-in a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .final-cta__proof { display: flex; align-items: center; gap: 13px; margin-top: 42px; }
        .final-cta__avatars { display: flex; padding-left: 8px; }
        .final-cta__avatars span { display: grid; width: 31px; height: 31px; margin-left: -8px; place-items: center; border: 2px solid var(--cta-paper); border-radius: 50%; background: #d7e6d8; color: #3e6950; font-size: 8px; font-weight: 800; letter-spacing: -.04em; }
        .final-cta__avatars span:nth-child(2) { background: #ecd9c5; color: #8b6848; }
        .final-cta__avatars span:nth-child(3) { background: #d7dcec; color: #59658b; }
        .final-cta__avatars span:last-child { background: #18251e; color: #d8eee0; }
        .final-cta__proof p { max-width: 250px; margin: 0; color: #718078; font-size: 11px; line-height: 1.45; }
        .final-cta__proof strong { color: #1c3327; font-size: 13px; }
        .final-cta__metrics { display: flex; max-width: 440px; margin-top: 27px; border-top: 1px solid rgb(189 203 192 / .75); padding-top: 15px; }
        .final-cta__metrics div { display: flex; min-width: 106px; flex-direction: column; gap: 4px; border-right: 1px solid rgb(189 203 192 / .7); padding-right: 21px; margin-right: 21px; }
        .final-cta__metrics div:last-child { border-right: 0; margin-right: 0; }
        .final-cta__metrics strong { color: #183526; font-size: 17px; letter-spacing: -.04em; }
        .final-cta__metrics span { color: #859088; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8px; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
        .final-cta__visual { position: relative; min-width: 0; }
        .final-cta__visual-heading { display: flex; justify-content: space-between; margin: 0 13px 12px 22px; color: #829087; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; }
        .final-cta__visual-heading span:last-child { display: flex; align-items: center; gap: 6px; color: #4f8266; }
        .final-cta__visual-heading i { width: 5px; height: 5px; border-radius: 50%; background: #3baa73; }
        .final-cta__mode-tabs { position: relative; z-index: 50; display: flex; width: fit-content; max-width: calc(100% - 30px); align-items: center; gap: 3px; margin-left: 22px; border: 1px solid rgb(210 220 210 / .95); border-radius: 999px; padding: 4px; background: rgb(255 255 255 / .7); box-shadow: 0 6px 15px -13px rgb(28 51 39 / .65); }
        .final-cta__mode-tabs button { display: inline-flex; min-height: 29px; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 0 11px; background: transparent; color: #78867d; font: inherit; font-size: 10px; font-weight: 750; cursor: pointer; white-space: nowrap; }
        .final-cta__mode-tabs button:hover { color: #245b3e; }
        .final-cta__mode-tabs button.is-active { background: #183a2a; color: #f4fbf5; box-shadow: 0 4px 9px -6px rgb(24 58 42 / .8); }
        .final-cta__mode-tabs button:focus-visible, .final-cta button:focus-visible, .final-cta__drag-surface:focus-visible { outline: 2px solid #278b5c; outline-offset: 3px; }
        .final-cta__shuffle { width: 29px; justify-content: center; padding: 0 !important; color: #5e7968 !important; }
        .final-cta__shuffle:hover { background: #e5f1e7 !important; }
        .final-cta__stage { position: relative; height: 575px; margin-top: -3px; perspective: 1200px; perspective-origin: 50% 45%; }
        .final-cta__stage::before { position: absolute; inset: 30px 9px 28px; border: 1px solid rgb(198 213 201 / .72); border-radius: 22px; background-image: radial-gradient(circle, rgb(133 163 140 / .42) 1px, transparent 1.2px); background-size: 17px 17px; content: ''; opacity: .56; mask-image: linear-gradient(135deg, transparent 0, black 18%, black 80%, transparent 100%); }
        .final-cta__stage::after { position: absolute; inset: 65px 70px 70px 88px; z-index: -1; border-radius: 50%; background: rgb(184 220 192 / .37); content: ''; filter: blur(32px); }
        .final-cta__orbit { position: absolute; z-index: 0; border: 1px solid rgb(112 160 125 / .26); border-radius: 50%; transform: rotate(-18deg); }
        .final-cta__orbit::after { position: absolute; width: 7px; height: 7px; border: 2px solid #8fc8a2; border-radius: 50%; background: var(--cta-paper); content: ''; }
        .final-cta__orbit.orbit-one { top: 132px; left: 12%; width: 76%; height: 280px; }
        .final-cta__orbit.orbit-one::after { top: 17px; right: 16%; }
        .final-cta__orbit.orbit-two { top: 77px; left: 20%; width: 62%; height: 390px; transform: rotate(63deg); opacity: .5; }
        .final-cta__orbit.orbit-two::after { bottom: 28px; left: 19%; }
        .final-cta__stage-mark { position: absolute; z-index: 1; color: #7cac8b; font-size: 18px; font-weight: 400; }
        .final-cta__stage-mark.stage-mark-one { top: 68px; left: 9%; }
        .final-cta__stage-mark.stage-mark-two { right: 9%; bottom: 106px; font-size: 25px; }
        .final-cta__deck { position: absolute; inset: 46px 0 30px; z-index: 10; transform-style: preserve-3d; }
        .final-cta__drag-surface { --surface-drag-x: 0px; --surface-drag-y: 0px; --surface-base: translateZ(0); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; transform: var(--surface-base) translate3d(var(--surface-drag-x), var(--surface-drag-y), 0); transform-style: preserve-3d; will-change: transform; }
        .final-cta__drag-surface * { user-select: none; -webkit-user-select: none; }
        .final-cta__drag-surface[data-held="true"] { z-index: 120 !important; cursor: grabbing; transform: var(--surface-base) translate3d(var(--surface-drag-x), var(--surface-drag-y), 65px) scale(1.025); filter: drop-shadow(0 28px 24px rgb(51 78 58 / .2)); }
        .final-cta__drag-surface[data-springing="true"] { transition: none !important; }
        .final-cta__deck-card { position: absolute; top: 50%; left: 50%; width: min(630px, calc(100% - 120px)); aspect-ratio: 1.32; translate: -50% -50%; overflow: hidden; border: 1px solid rgb(195 207 196 / .95); border-radius: 28px; background: #fbfdf9; box-shadow: 24px 28px 45px -25px rgb(38 75 49 / .34), 0 15px 30px -22px rgb(38 75 49 / .45), 0 0 0 1px rgb(255 255 255 / .8) inset; transform-origin: center center; transition: transform 480ms cubic-bezier(.2,.76,.22,1), filter 300ms ease; }
        .final-cta__deck-card--depth-1 { border-color: rgb(195 207 196 / .68); background: rgb(251 253 249 / .62); box-shadow: 15px 21px 30px -24px rgb(38 75 49 / .24), 0 0 0 1px rgb(255 255 255 / .55) inset; filter: saturate(.78); backdrop-filter: blur(7px); }
        .final-cta__deck-card--depth-2 { border-color: rgb(195 207 196 / .48); background: rgb(251 253 249 / .42); box-shadow: 12px 18px 26px -24px rgb(38 75 49 / .18), 0 0 0 1px rgb(255 255 255 / .38) inset; filter: saturate(.58); opacity: .78; backdrop-filter: blur(11px); }
        .final-cta__deck-card--depth-1 .final-cta__canvas-card { background: rgb(251 253 249 / .62); }
        .final-cta__deck-card--depth-2 .final-cta__canvas-card { background: rgb(251 253 249 / .42); }
        .final-cta__deck-card--depth-1 .final-cta__window-bar, .final-cta__deck-card--depth-2 .final-cta__window-bar { background: rgb(255 255 255 / .56); }
        .final-cta__deck-card--depth-1 .final-cta__canvas-body { opacity: .56; }
        .final-cta__deck-card--depth-2 .final-cta__canvas-body { opacity: .38; }
        .final-cta__deck-card .final-cta__panel-content { width: 100%; height: 100%; }
        .final-cta__canvas-card { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; background: #fbfdf9; }
        .final-cta__window-bar { position: relative; display: flex; height: 51px; align-items: center; gap: 10px; border-bottom: 1px solid #e6ede5; padding: 0 20px; background: rgb(255 255 255 / .94); color: #819087; pointer-events: none; }
        .final-cta__traffic-lights { display: flex; gap: 5px; margin-right: 4px; }
        .final-cta__traffic-lights i { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / .07) inset; }
        .final-cta__traffic-lights i:first-child { background: #ff6a60; }.final-cta__traffic-lights i:nth-child(2) { background: #ffbf42; }.final-cta__traffic-lights i:last-child { background: #32c759; }
        .final-cta__window-title { margin-right: auto; color: var(--cta-green, #065f46); font-size: 12px; font-weight: 750; letter-spacing: -.015em; white-space: nowrap; }
        .final-cta__window-app-icon { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 8px; background: #ffb52e; color: #fff; box-shadow: 0 4px 8px -6px rgb(197 123 17 / .8); }
        .final-cta__window-badge { border: 1px solid #b7e4c3; border-radius: 999px; padding: 5px 10px; background: #edfbf0; color: #32845a; font-family: ui-monospace, monospace; font-size: 8px; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
        .final-cta__window-badge--whiteboard { border-color: #b7e4c3; background: #edfbf0; color: #32845a; }
        .final-cta__window-bar > svg { color: #5fa377; }
        .final-cta__canvas-body { position: absolute; inset: 51px 0 38px; overflow: hidden; background-color: #fff; background-image: radial-gradient(circle, #d9dfda 1px, transparent 1.15px); background-size: 19px 19px; }
        .final-cta__plan-kicker { display: none; }
        .final-cta__wire-map { position: absolute; inset: 28px 8% 9%; width: 84%; height: 72%; overflow: visible; pointer-events: none; }
        .final-cta__wire-map path { fill: none; stroke: #99c8a8; stroke-dasharray: 3 4; stroke-linecap: round; stroke-width: 1.7; }
        .final-cta__mini-node { position: absolute; z-index: 2; display: flex; min-width: 78px; min-height: 34px; align-items: center; gap: 7px; border: 1px solid #bddac4; border-radius: 9px; padding: 7px 9px; background: rgb(255 255 255 / .94); color: #315642; font-size: 9px; box-shadow: 0 11px 16px -13px rgb(34 87 53 / .62), 0 0 0 1px rgb(255 255 255 / .75) inset; }
        .final-cta__mini-node svg { color: #2e9960; }
        .final-cta__mini-node strong { font-size: 9px; font-weight: 750; white-space: nowrap; }
        .final-cta__plan-node--spark { top: 52px; left: 50%; translate: -50% 0; background: #e7f5e9; }
        .final-cta__plan-node--shape { top: 133px; left: 20%; }.final-cta__plan-node--flow { top: 133px; right: 20%; }.final-cta__plan-node--ship { bottom: 24px; left: 50%; translate: -50% 0; background: #183e2b; color: #edf9ed; border-color: #183e2b; }.final-cta__plan-node--ship svg { color: #a6ddb3; }
        .final-cta__canvas-note { position: absolute; display: inline-flex; align-items: center; gap: 4px; color: #4d9566; font-family: Georgia, serif; font-size: 10px; font-style: italic; }
        .final-cta__canvas-note--plan { right: 13%; bottom: 30px; transform: rotate(-4deg); }.final-cta__canvas-note--whiteboard { right: 10%; bottom: 24px; transform: rotate(-4deg); }
        .final-cta__architecture-body { background-color: #fff; }
        .final-cta__arch-node--client { top: 56px; left: 50%; translate: -50% 0; }.final-cta__arch-node--api { top: 103px; left: 50%; translate: -50% 0; background: #e8f5eb; }.final-cta__arch-node--services { top: 151px; left: 50%; translate: -50% 0; background: #183e2b; color: white; border-color: #183e2b; }.final-cta__arch-node--services svg { color: #b8e9c1; }.final-cta__arch-node--data { bottom: 20px; left: 13%; }.final-cta__arch-node--events { bottom: 20px; left: 50%; translate: -50% 0; }.final-cta__arch-node--docs { right: 13%; bottom: 20px; }
        .final-cta__whiteboard-body { background-color: #fff; background-image: radial-gradient(circle, #d9dfda 1px, transparent 1.15px); }
        .final-cta__whiteboard-arrow { position: absolute; inset: 39px 10% 37px; z-index: 0; width: 80%; height: 74%; overflow: visible; pointer-events: none; }
        .final-cta__whiteboard-arrow path { fill: none; stroke: #2b8a60; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5; }
        .final-cta__white-node--question { top: 22px; left: 8%; min-width: 184px; flex-direction: column; align-items: flex-start; gap: 7px; border-color: #f0c965; border-radius: 10px; background: #fff0bb; rotate: -5deg; }
        .final-cta__white-node--insight { top: 18px; right: 8%; min-width: 205px; flex-direction: column; align-items: flex-start; gap: 7px; border: 2px dashed #58d5a3; border-radius: 13px; background: rgb(244 255 248 / .88); rotate: 1deg; }
        .final-cta__white-node--decision { bottom: 20px; left: 9%; min-width: 220px; flex-direction: column; align-items: flex-start; gap: 7px; border-color: #8fdfb8; border-radius: 10px; background: #baf2d5; rotate: -2deg; }
        .final-cta__white-node--next { right: 8%; bottom: 35px; min-width: 176px; border-color: #dfe7e1; border-radius: 999px; background: rgb(255 255 255 / .96); color: #394d41; rotate: 1deg; }
        .final-cta__white-note-label, .final-cta__white-approved { color: #9b6722; font-family: ui-monospace, monospace; font-size: 8px; font-weight: 850; letter-spacing: .08em; }
        .final-cta__white-note-script, .final-cta__white-journey-title, .final-cta__white-approved-copy { font-family: var(--final-handwriting), 'Comic Sans MS', 'Bradley Hand', cursive; font-size: 15px; font-weight: 500; line-height: 1.05; }
        .final-cta__white-note-script { color: #74521e; }.final-cta__white-journey-title { color: #236a4b; font-size: 16px; }.final-cta__white-journey-copy { color: #61706a; font-size: 10px; font-weight: 700; letter-spacing: .03em; }.final-cta__white-approved { display: inline-flex; align-items: center; gap: 5px; color: #37825c; }.final-cta__white-approved svg { color: #24875a; }.final-cta__white-approved-copy { color: #216444; }.final-cta__white-node--next svg { color: #ef9c19; }.final-cta__white-node--next strong { font-size: 11px; }
        .final-cta__canvas-toolbar { position: absolute; top: 50%; left: 17px; z-index: 20; display: flex; align-items: center; flex-direction: column; gap: 7px; border: 1px solid #d8e3d9; border-radius: 15px; padding: 8px; background: rgb(255 255 255 / .95); box-shadow: 0 10px 18px -13px rgb(26 69 43 / .55); pointer-events: auto; transform: translateY(-50%); }
        .final-cta__canvas-toolbar button { display: grid; width: 27px; height: 27px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #5e7164; cursor: pointer; }
        .final-cta__canvas-toolbar button:hover { background: #eef7ee; color: #288050; }
        .final-cta__canvas-toolbar button.is-active { background: #168051; color: #fff; }
        .final-cta__canvas-tool-divider { width: 19px; height: 1px; background: #dce6dc; }
        .final-cta__canvas-status { position: absolute; right: 0; bottom: 0; left: 0; display: flex; height: 38px; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid #e6ede5; padding: 0 21px; background: #fff; color: #9aa79e; font-family: ui-monospace, monospace; font-size: 8px; letter-spacing: .08em; text-transform: uppercase; pointer-events: none; }.final-cta__canvas-status-active { display: inline-flex; align-items: center; gap: 5px; color: #3b9561; font-weight: 800; }.final-cta__canvas-status--whiteboard .final-cta__canvas-status-active { color: #ad6c1b; }.final-cta__canvas-status--whiteboard .final-cta__canvas-status-active i { background: #e99d25; }.final-cta__canvas-status i { display: block; width: 5px; height: 5px; border-radius: 50%; background: #51b776; }
        .final-cta__satellite { position: absolute; z-index: 35; border: 1px solid rgb(207 220 207 / .95); background: rgb(255 255 255 / .92); box-shadow: 17px 22px 28px -21px rgb(38 75 49 / .45), 0 0 0 1px rgb(255 255 255 / .9) inset; backdrop-filter: blur(9px); transition: transform 460ms cubic-bezier(.2,.76,.22,1); }
        .final-cta__assistant-card { bottom: 8px; left: 4%; width: 235px; border-radius: 14px; padding: 15px; animation: final-cta-satellite-float-a 5.4s ease-in-out infinite; }.final-cta__system-card { right: 3%; bottom: 40px; width: 188px; border-radius: 14px; padding: 14px; animation: final-cta-satellite-float-b 6.2s ease-in-out .6s infinite; }
        @keyframes final-cta-satellite-float-a { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
        @keyframes final-cta-satellite-float-b { 0%, 100% { translate: 0 0; } 50% { translate: 0 -9px; } }
        .final-cta__satellite[data-held="true"] { animation: none; translate: 0 0; }
        .final-cta__satellite-head { display: flex; align-items: center; gap: 8px; color: #263b2d; font-size: 10px; font-weight: 800; letter-spacing: -.015em; }.final-cta__satellite-menu { margin-left: auto; color: #9eaaa1; letter-spacing: 1px; }.final-cta__assistant-icon, .final-cta__check-icon { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 8px; background: #e7dafa; color: #7955a8; }.final-cta__check-icon { width: 22px; height: 22px; border-radius: 50%; background: #2f9d64; color: #fff; }.final-cta__satellite p { margin: 13px 0 12px; color: #667269; font-size: 10px; line-height: 1.55; }.final-cta__assistant-footer { display: flex; align-items: center; justify-content: space-between; color: #6d7a70; font-size: 9px; font-weight: 750; }.final-cta__assistant-footer > span { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 5px 7px; background: #f1f5ef; }.final-cta__assistant-footer button { display: grid; width: 28px; height: 28px; place-items: center; border: 0; border-radius: 50%; background: #248d58; color: #fff; cursor: pointer; }.final-cta__assistant-footer button:hover { background: #176f43; }
        .final-cta__system-map { display: flex; align-items: center; flex-direction: column; margin: 14px 0 9px; }.final-cta__system-root { min-width: 47px; border-radius: 5px; padding: 5px 9px; background: #e0f2e2; color: #358357; font-family: ui-monospace, monospace; font-size: 8px; font-weight: 800; text-align: center; }.final-cta__system-map > i { width: 1px; height: 10px; background: #9ccaaa; }.final-cta__system-map > div { display: flex; gap: 13px; border-top: 1px solid #9ccaaa; padding-top: 8px; }.final-cta__system-map b { display: block; width: 24px; height: 14px; border: 1px solid #c2dfc7; border-radius: 4px; background: #f0faf0; }.final-cta__system-caption { color: #75a080; font-family: ui-monospace, monospace; font-size: 8px; letter-spacing: .09em; text-transform: uppercase; }
        .final-cta__tool-palette { position: absolute; z-index: 60; top: 50%; left: 2%; display: flex; align-items: center; flex-direction: column; gap: 5px; border: 1px solid rgb(206 220 209 / .95); border-radius: 12px; padding: 6px; background: rgb(255 255 255 / .92); box-shadow: 0 8px 18px -14px rgb(24 58 42 / .8); transform: translateY(-44%); }.final-cta__tool-palette button { display: grid; width: 27px; height: 27px; place-items: center; border: 0; border-radius: 7px; background: transparent; color: #6b8172; cursor: pointer; }.final-cta__tool-palette button:hover { background: #eaf4ea; color: #257348; }.final-cta__tool-palette button.is-active { background: #1b8051; color: #fff; }.final-cta__tool-divider { width: 17px; height: 1px; background: #d9e4d9; }
        .final-cta__visual-caption { margin: 24px 22px 0; color: #87938a; font-size: 10px; line-height: 1.4; }.final-cta__visual-caption span { color: #4a8b60; font-family: ui-monospace, monospace; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .final-cta__footer { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid rgb(205 216 204 / .78); padding: 0 32px; background: rgb(255 255 255 / .22); color: #8a958d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }.final-cta__footer span:first-child { display: inline-flex; align-items: center; gap: 7px; color: #3d8958; font-weight: 800; }.final-cta__footer i { display: block; width: 6px; height: 6px; border-radius: 50%; background: #46b36d; box-shadow: 0 0 0 4px rgb(70 179 109 / .13); }
        .final-cta__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        @media (max-width: 1200px) { .final-cta__main { gap: 42px; }.final-cta__deck-card { width: min(500px, calc(100% - 100px)); }.final-cta__assistant-card { left: 0; }.final-cta__system-card { right: 0; } }
        @media (max-width: 940px) { .final-cta__main { grid-template-columns: 1fr; gap: 70px; padding-top: 68px; }.final-cta__copy { max-width: 620px; }.final-cta__visual { width: min(100%, 720px); margin-inline: auto; }.final-cta__stage { height: 570px; }.final-cta__footer span:nth-child(2) { display: none; } }
        @media (max-width: 640px) { .final-cta__main { width: min(100% - 32px, 540px); padding: 48px 0 58px; }.final-cta h2 { font-size: clamp(44px, 13vw, 68px); }.final-cta__description { font-size: 14px; }.final-cta__proof { margin-top: 34px; }.final-cta__metrics div { min-width: 0; padding-right: 12px; margin-right: 12px; }.final-cta__metrics span { font-size: 7px; }.final-cta__visual-heading { margin-inline: 6px; font-size: 8px; }.final-cta__mode-tabs { margin-left: 6px; }.final-cta__mode-tabs button { padding-inline: 8px; font-size: 9px; }.final-cta__mode-tabs button svg { display: none; }.final-cta__stage { height: 570px; margin-inline: -10px; }.final-cta__stage::before { inset-inline: 2px; }.final-cta__deck { top: 48px; right: 0; bottom: 30px; left: 0; }.final-cta__deck-card { width: calc(100% - 56px); aspect-ratio: 1.18; border-radius: 22px; }.final-cta__window-bar { height: 36px; padding-inline: 10px; }.final-cta__window-app-icon { width: 21px; height: 21px; border-radius: 6px; }.final-cta__window-title { font-size: 9px; }.final-cta__canvas-body { inset: 36px 0 23px; }.final-cta__window-badge, .final-cta__window-bar > svg { display: none; }.final-cta__canvas-status { height: 23px; gap: 7px; padding-inline: 9px; font-size: 6px; }.final-cta__plan-node--shape { left: 12%; }.final-cta__plan-node--flow { right: 12%; }.final-cta__arch-node--data { left: 5%; }.final-cta__arch-node--docs { right: 5%; }.final-cta__white-node--question { top: 15px; left: 5%; min-width: 0; width: 43%; padding: 6px; gap: 4px; }.final-cta__white-node--insight { top: 13px; right: 5%; min-width: 0; width: 47%; padding: 6px; gap: 4px; }.final-cta__white-node--decision { bottom: 12px; left: 5%; min-width: 0; width: 49%; padding: 6px; gap: 4px; }.final-cta__white-node--next { right: 5%; bottom: 19px; min-width: 0; width: 40%; padding: 6px 8px; }.final-cta__white-note-label, .final-cta__white-approved { font-size: 6px; }.final-cta__white-note-script, .final-cta__white-approved-copy { font-size: 9px; }.final-cta__white-journey-title { font-size: 10px; }.final-cta__white-journey-copy { font-size: 7px; }.final-cta__white-node--next strong { font-size: 8px; }.final-cta__whiteboard-arrow { inset: 25px 7% 24px; width: 86%; height: 78%; }.final-cta__assistant-card { bottom: 8px; left: 1%; width: 190px; padding: 11px; }.final-cta__system-card { right: 1%; bottom: 32px; width: 158px; padding: 11px; }.final-cta__satellite p { font-size: 9px; }.final-cta__tool-palette { left: 0; }.final-cta__visual-caption { margin-inline: 6px; }.final-cta__footer { flex-wrap: wrap; gap: 8px; padding: 13px 16px; font-size: 8px; } }
        @media (prefers-reduced-motion: reduce) { .final-cta *, .final-cta *::before, .final-cta *::after { animation: none !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }.final-cta__drag-surface[data-held="true"] { transform: var(--surface-base) translate3d(0, 0, 0) !important; filter: none; } }
      `}</style>
    </section>
  );
}

export default FinalCtaSection;
