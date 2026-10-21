'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight, ArrowUpRight, FileCode2, FileText, GitBranch, Globe,
  Layers, Lightbulb, Pause, Play, Sparkles, Volume2, VolumeX,
} from '@/lib/icons';

type LayerId = 0 | 1 | 2;
type Point = { x: number; y: number };
type Layout = Point & { z: number; rotZ: number; rotX: number; rotY: number; scale: number; opacity: number; zIndex: number };
type Drag = { id: LayerId; pointerId: number; start: Point; moved: boolean };
type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const LAYERS = [
  { header: '01 / IDEA', status: 'A rough draft capturing the first spark.', frequency: 440, title: 'Generate architecture', description: 'Describe a system in plain language. Get a structured, editable diagram back in seconds.', icon: GitBranch },
  { header: '02 / SYSTEM DESIGN', status: 'Living architecture with connected dependencies.', frequency: 554, title: 'Map the moving parts', description: 'Make flows, dependencies, and decisions legible with a canvas that stays out of the way.', icon: Layers },
  { header: '03 / TECHNICAL DOCS', status: 'A handoff people can actually use.', frequency: 659, title: 'Turn diagrams into docs', description: 'Move from rough thinking to a useful technical spec without losing the original thread.', icon: FileText },
] as const;
const IDS: readonly LayerId[] = [0, 1, 2];
const STACK_LAYOUTS: Record<LayerId, readonly [Layout, Layout, Layout]> = {
  0: [
    { x: -10, y: -18, z: 35, rotZ: -8, rotX: 9, rotY: -12, scale: 1, opacity: 1, zIndex: 30 },
    { x: 18, y: 22, z: -50, rotZ: -4, rotX: 6, rotY: -8, scale: 0.96, opacity: 0.88, zIndex: 20 },
    { x: 38, y: 48, z: -90, rotZ: -1, rotX: 3, rotY: -5, scale: 0.93, opacity: 0.82, zIndex: 10 },
  ],
  1: [
    { x: -28, y: -46, z: -70, rotZ: -9, rotX: 10, rotY: -13, scale: 0.94, opacity: 0.86, zIndex: 10 },
    { x: 4, y: -6, z: 30, rotZ: -6, rotX: 7, rotY: -10, scale: 1, opacity: 1, zIndex: 30 },
    { x: 28, y: 36, z: -40, rotZ: -2, rotX: 4, rotY: -6, scale: 0.96, opacity: 0.88, zIndex: 20 },
  ],
  2: [
    { x: -28, y: -48, z: -80, rotZ: -9, rotX: 10, rotY: -14, scale: 0.94, opacity: 0.88, zIndex: 10 },
    { x: -14, y: -24, z: -40, rotZ: -7, rotX: 8, rotY: -11, scale: 0.97, opacity: 0.95, zIndex: 20 },
    { x: 10, y: 10, z: 20, rotZ: -4, rotX: 5, rotY: -7, scale: 1, opacity: 1, zIndex: 30 },
  ],
};

const OPEN_LAYOUTS: readonly [Layout, Layout, Layout] = [
  { x: 0, y: -285, z: 0, rotZ: -1, rotX: 0, rotY: 0, scale: 0.96, opacity: 1, zIndex: 30 },
  { x: 0, y: 0, z: 0, rotZ: 0, rotX: 0, rotY: 0, scale: 0.96, opacity: 1, zIndex: 30 },
  { x: 0, y: 285, z: 0, rotZ: 1, rotX: 0, rotY: 0, scale: 0.96, opacity: 1, zIndex: 30 },
];

function IdeaCard() {
  return (
    <>
      <span className="sb-workflow-card-header">
        <span className="sb-workflow-row"><span className="sb-workflow-mini-icon sb-workflow-mini-icon--idea"><Lightbulb size={14} aria-hidden="true" /></span><strong>01 / IDEA</strong></span>
        <span className="sb-workflow-faint">ROUGH DRAFT</span>
      </span>
      <span className="sb-workflow-idea-body">
        <span className="sb-workflow-root"><span className="sb-workflow-dot bg-neutral-800" />Raw Thought / Problem Statement</span>
        <span className="sb-workflow-branches" />
        <span className="sb-workflow-idea-children"><span>Unstructured Notes</span><span>Core Hypothesis</span></span>
      </span>
      <span className="sb-workflow-card-footer"><span>INPUT: NATURAL LANGUAGE</span><strong className="text-emerald-700">READY TO SYNTHESIZE →</strong></span>
    </>
  );
}

function SystemCard() {
  return (
    <>
      <span className="sb-workflow-card-header">
        <span className="sb-workflow-row"><span className="sb-workflow-mini-icon sb-workflow-mini-icon--system"><Layers size={14} aria-hidden="true" /></span><strong>02 / SYSTEM DESIGN</strong></span>
        <span className="font-semibold text-blue-600">SYNTHESIZED</span>
      </span>
      <span className="sb-workflow-system-body">
        <span className="sb-workflow-system-top"><span className="sb-workflow-client"><Globe size={12} className="text-emerald-400" aria-hidden="true" />Client App</span><span className="sb-workflow-protocol">HTTPS / REST</span><span className="sb-workflow-gateway">API Gateway</span></span>
        <span className="sb-workflow-bus"><span>Event Stream</span></span>
        <span className="sb-workflow-services"><span>Auth Core<i className="sb-workflow-dot bg-emerald-500" /></span><span>Postgres DB<i className="sb-workflow-dot bg-blue-500" /></span></span>
      </span>
      <span className="sb-workflow-card-footer"><span>SERVICES: 4 CONNECTED</span><strong className="text-blue-600">FLOW VERIFIED</strong></span>
    </>
  );
}

function DocsCard() {
  return (
    <>
      <span className="sb-workflow-card-header sb-workflow-card-header--docs"><strong>03 / TECHNICAL DOCS</strong><FileText size={16} aria-hidden="true" /></span>
      <span className="sb-workflow-docs-body">
        <span className="sb-workflow-docs-meta"><span className="sb-workflow-file"><FileCode2 size={14} className="text-neutral-600" aria-hidden="true" />SYSTEM-HANDOFF.MD</span><span>SAVED JUST NOW</span></span>
        <span className="sb-workflow-category">Decision Record</span>
        <strong className="sb-workflow-docs-title">From intent to implementation</strong>
        <span className="sb-workflow-callout"><Sparkles size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />Context stays attached to every decision.</span>
      </span>
      <span className="sb-workflow-card-footer"><span>AUTONOMOUS SPECIFICATION</span><strong className="text-emerald-700">READY FOR REVIEW</strong></span>
    </>
  );
}

export function WorkflowShowcase() {
  const stageId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const platterRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const activeRef = useRef<LayerId>(2);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const [active, setActive] = useState<LayerId>(2);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [dragging, setDragging] = useState<LayerId | null>(null);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReducedMotion(query.matches);
      if (query.matches && platterRef.current) platterRef.current.style.transform = '';
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => {
    const context = audioRef.current;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }, []);

  // Browsers require a user gesture before audio can start. Auto-demo never
  // creates or resumes a context, but can reuse one the visitor has enabled.
  const enableAudio = () => {
    if (!soundRef.current) return;
    try {
      const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!Constructor) return;
      const context = audioRef.current ?? new Constructor();
      audioRef.current = context;
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
    } catch {
      // Audio is an enhancement: blocked/unsupported sound must not stop the demo.
    }
  };

  const playSound = useCallback((frequency: number, whoosh = true) => {
    const context = audioRef.current;
    if (!soundRef.current || !context || context.state !== 'running') return;
    try {
      const now = context.currentTime;
      if (whoosh) {
        const size = Math.floor(context.sampleRate * 0.12);
        const buffer = context.createBuffer(1, size, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < size; i += 1) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.035));
        const noise = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
        noise.start(now);
        noise.stop(now + 0.12);
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.25, now + 0.16);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now);
      oscillator.stop(now + 0.22);
    } catch {
      // A browser audio-device interruption should not interrupt interaction.
    }
  }, []);

  const selectLayer = useCallback((id: LayerId) => {
    if (activeRef.current === id) return;
    activeRef.current = id;
    setActive(id);
    playSound(LAYERS[id].frequency);
  }, [playSound]);

  useEffect(() => {
    if (!demoPlaying || reducedMotion) return;
    const timer = window.setInterval(() => {
      // Do not move the stack underneath a captured pointer. The demo resumes
      // on its next tick after release without changing the play/pause choice.
      if (!dragRef.current) selectLayer(((activeRef.current + 1) % 3) as LayerId);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [demoPlaying, reducedMotion, selectLayer]);

  const selectManually = (id: LayerId) => {
    enableAudio();
    selectLayer(id);
  };

  const handleTilt = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCanvasOpen || reducedMotion || event.pointerType === 'touch' || dragRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (platterRef.current) platterRef.current.style.transform = `rotateX(${-y * 8}deg) rotateY(${x * 10}deg)`;
  };
  const resetTilt = () => { if (platterRef.current) platterRef.current.style.transform = ''; };

  const toggleCanvas = () => {
    enableAudio();
    setIsCanvasOpen((open) => !open);
    playSound(isCanvasOpen ? 400 : 700, false);
    resetTilt();
  };

  const handleViewportClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.sb-workflow-card')) return;
    toggleCanvas();
  };

  const startDrag = (id: LayerId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    enableAudio();
    suppressClickRef.current = false;
    dragRef.current = { id, pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, moved: false };
    setDragging(id);
    setOffset({ x: 0, y: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
    playSound(LAYERS[id].frequency);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = event.clientX - drag.start.x;
    const y = event.clientY - drag.start.y;
    drag.moved ||= Math.hypot(x, y) > 4;
    setOffset({ x: x * 0.35, y: y * 0.35 });
    event.preventDefault();
  };
  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClickRef.current = drag.moved || event.type !== 'pointerup';
    dragRef.current = null;
    setDragging(null);
    setOffset({ x: 0, y: 0 });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resetTilt();
  };

  // The reference layout and presentation are deliberately scoped to this
  // section; none of the existing workflow/global selectors are reused.
  return (
    <section ref={sectionRef} id="workflow-showcase" className="sb-workflow" aria-labelledby="sb-workflow-title" data-reduced-motion={reducedMotion}>
      <div className="sb-workflow-main">
        <div className="sb-workflow-grid">
          <div className="sb-workflow-copy">
            <p className="sb-workflow-eyebrow"><span className="sb-workflow-dot bg-emerald-500" />A clearer way to think</p>
            <h2 id="sb-workflow-title">Ideas get<br />sharper<br /><em>when you<br />can see<br />them.</em></h2>
            <p className="sb-workflow-description">Turn scattered thoughts into clear diagrams, specs and documentation — in a single, visual flow.</p>
            <div className="sb-workflow-actions">
              <button type="button" className="sb-workflow-explore" onClick={() => selectManually(((active + 1) % 3) as LayerId)}>Explore the workflow<ArrowRight size={16} aria-hidden="true" /></button>
              <div className="sb-workflow-demo-controls" role="group" aria-label="Workflow playback and sound">
              <button type="button" className="sb-workflow-demo" disabled={reducedMotion} title={reducedMotion ? 'Automatic animation is disabled for reduced motion' : undefined} aria-pressed={demoPlaying && !reducedMotion} onClick={() => {
                enableAudio();
                setDemoPlaying(!demoPlaying);
                playSound(demoPlaying ? 400 : 700, false);
              }}>
                {demoPlaying && !reducedMotion ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {demoPlaying && !reducedMotion ? 'Pause demo' : 'Play demo'}
              </button>
              <button type="button" className="sb-workflow-sound" aria-pressed={soundOn} aria-label={soundOn ? 'Mute workflow sound effects' : 'Enable workflow sound effects'} onClick={() => {
                const next = !soundOn;
                soundRef.current = next;
                setSoundOn(next);
                if (next) { enableAudio(); playSound(660, false); }
              }}>
                {soundOn ? <Volume2 size={14} className="text-emerald-600" aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
                {soundOn ? 'Sound On' : 'Muted'}
              </button>
              </div>
            </div>
          </div>

          <div className="sb-workflow-center">
            <div className={`sb-workflow-viewport ${isCanvasOpen ? 'sb-workflow-viewport--open' : ''}`} onPointerMove={handleTilt} onPointerLeave={resetTilt} onPointerCancel={resetTilt} onClick={handleViewportClick}>
              <div className="sb-workflow-blueprint" aria-hidden="true" />
              <div className="sb-workflow-canvas-header">
                <span className="sb-workflow-window-controls" aria-hidden="true"><i className="sb-workflow-window-control--close" /><i className="sb-workflow-window-control--minimize" /><i className="sb-workflow-window-control--maximize" /></span>
                <span className="sb-workflow-window-title">Canvas / Active thread</span>
                <strong>{LAYERS[active].header}</strong>
              </div>
              <div id={stageId} className="sb-workflow-stage">
                <div className="sb-workflow-annotation" aria-hidden="true"><span>Explore<br />layer by layer</span><svg width="22" height="28" viewBox="0 0 24 30" fill="none"><path d="M6 4C14 10 18 16 12 26M8 20L12 26L18 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div className="sb-workflow-deck-size">
                  <div ref={platterRef} className={`sb-workflow-platter ${isCanvasOpen ? 'sb-workflow-platter--open' : ''}`}>
                    {IDS.map((id) => {
                      const layout = isCanvasOpen ? OPEN_LAYOUTS[id] : STACK_LAYOUTS[active][id];
                      const isDragging = dragging === id;
                      const x = layout.x + (isDragging ? offset.x : 0);
                      const y = layout.y + (isDragging ? offset.y : 0);
                      const style: CSSProperties = {
                        zIndex: isDragging ? 40 : layout.zIndex,
                        opacity: layout.opacity,
                        transform: `translate3d(${x}px, ${y}px, ${layout.z + (isDragging ? 15 : 0)}px) rotateZ(${layout.rotZ}deg) rotateX(${reducedMotion ? 0 : layout.rotX}deg) rotateY(${reducedMotion ? 0 : layout.rotY}deg) scale(${layout.scale})`,
                      };
                      return (
                        <button key={id} type="button" className={`sb-workflow-card ${isCanvasOpen ? 'sb-workflow-card--open' : ''} ${isDragging ? 'sb-workflow-card--dragging' : ''}`} style={style} aria-pressed={active === id} aria-label={`Explore ${LAYERS[id].header}; drag to nudge this card`} onPointerDown={(event) => startDrag(id, event)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag} onClick={(event) => {
                          if (event.detail !== 0 && suppressClickRef.current) { suppressClickRef.current = false; return; }
                          selectManually(id);
                          setIsCanvasOpen(true);
                          resetTilt();
                        }}>
                          {id === 0 ? <IdeaCard /> : id === 1 ? <SystemCard /> : <DocsCard />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="sb-workflow-canvas-footer">
                <span className="sb-workflow-thread"><span className={`sb-workflow-dot bg-emerald-500 ${demoPlaying && !reducedMotion ? 'sb-workflow-pulse' : ''}`} /><span className="sb-workflow-exploring">Exploring</span><strong aria-live={demoPlaying && !reducedMotion ? 'off' : 'polite'}>{LAYERS[active].status}</strong></span>
                <button type="button" className="sb-workflow-view-toggle" aria-expanded={isCanvasOpen} aria-controls={stageId} onClick={(event) => {
                  event.stopPropagation();
                  toggleCanvas();
                }}>{isCanvasOpen ? 'Stack cards' : 'Show all cards'}<ArrowUpRight size={12} aria-hidden="true" /></button>
              </div>
            </div>
          </div>

          <div className="sb-workflow-steps" id="workflow-showcase-steps">
            <div className="sb-workflow-steps-header"><span>The Workflow<span className="sb-workflow-live"><i className="sb-workflow-dot bg-emerald-500" />{demoPlaying && !reducedMotion ? 'LIVE' : 'PAUSED'}</span></span><ArrowUpRight size={16} className="text-neutral-500" aria-hidden="true" /></div>
            <ol className="sb-workflow-step-list">
              {IDS.map((id) => {
                const layer = LAYERS[id];
                const Icon = layer.icon;
                return (
                  <li key={id}>
                    <button type="button" className={`sb-workflow-step ${active === id ? 'sb-workflow-step--active' : ''}`} onClick={() => selectManually(id)} aria-current={active === id ? 'step' : undefined}>
                      <span className="sb-workflow-step-bar" aria-hidden="true" />
                      <span className="sb-workflow-step-number">0{id + 1}</span>
                      <span className="sb-workflow-step-icon"><Icon size={16} aria-hidden="true" /></span>
                      <span className="sb-workflow-step-copy"><span className="sb-workflow-step-title"><strong>{layer.title}</strong><ArrowUpRight size={14} aria-hidden="true" /></span><span className="sb-workflow-step-description">{layer.description}</span></span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="sb-workflow-helper"><Sparkles size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />Click a layer or step to follow the thread.</p>
          </div>
        </div>
      </div>
      {/* Component-scoped styles below keep the rest of the landing page intact. */}
      <style>{`
        .sb-workflow {
          --sb-bg: var(--landing-background, #faf9f6);
          --sb-ink: #111827;
          --sb-muted: #6b7280;
          --sb-rule: #e5e7eb;
          position: relative;
          isolation: isolate;
          width: 100%;
          overflow: hidden;
          background: var(--sb-bg);
          color: var(--sb-ink);
          font-family: var(--font-sans), Arial, sans-serif;
          user-select: none;
        }
        .sb-workflow::selection { background: #d1fae5; color: #064e3b; }
        .sb-workflow-sound { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; border: 1px solid #e5e7eb; border-radius: 999px; padding: 0 14px; cursor: pointer; background: rgb(255 255 255 / 0.9); color: #374151; font-family: inherit; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); transition: background-color 160ms ease, transform 160ms ease; }
        .sb-workflow-sound:hover { background: white; transform: translateY(-1px); }
        .sb-workflow-main { position: relative; z-index: 1; display: flex; width: min(100%, 1600px); min-height: 805px; margin: 0 auto; align-items: center; justify-content: center; overflow: hidden; padding: 12px clamp(18px, 4vw, 48px); }
        .sb-workflow-grid { display: grid; grid-template-columns: minmax(260px, 4fr) minmax(490px, 5fr) minmax(280px, 3fr); width: 100%; align-items: center; gap: clamp(24px, 3vw, 48px); }
        .sb-workflow-copy { z-index: 20; display: flex; flex-direction: column; justify-content: center; padding-right: 8px; }
        .sb-workflow-eyebrow { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: #4b5563; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }
        .sb-workflow-dot { display: inline-block; width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; }
        .sb-workflow-copy h2 { margin: 0 0 20px; color: #030712; font-size: clamp(42px, 4.1vw, 62px); font-weight: 800; letter-spacing: -0.075em; line-height: 1.06; }
        .sb-workflow-copy h2 em { display: block; color: var(--heading-accent, #065f46); font-family: var(--font-display), Georgia, serif; font-size: 1.03em; font-style: italic; font-weight: 400; letter-spacing: -0.055em; line-height: 0.98; }
        .sb-workflow-description { max-width: 330px; margin: 0 0 28px; color: #4b5563; font-size: 14px; line-height: 1.7; }
        .sb-workflow-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .sb-workflow-demo-controls { display: inline-flex; align-items: center; gap: 10px; }
        .sb-workflow-explore, .sb-workflow-demo { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; gap: 10px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 800; letter-spacing: -0.02em; transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease; }
        .sb-workflow-explore { border: 1px solid #030712; padding: 0 22px; background: #030712; color: white; box-shadow: 0 5px 13px rgb(17 24 39 / 0.14); }
        .sb-workflow-explore:hover, .sb-workflow-demo:hover { transform: translateY(-1px); }
        .sb-workflow-explore:hover { background: #111827; box-shadow: 0 8px 16px rgb(17 24 39 / 0.18); }
        .sb-workflow-demo { border: 1px solid #e5e7eb; padding: 0 16px; background: rgb(255 255 255 / 0.9); color: #1f2937; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); }
        .sb-workflow-demo:disabled { cursor: not-allowed; opacity: 0.56; }
        .sb-workflow-explore:focus-visible, .sb-workflow-demo:focus-visible, .sb-workflow-sound:focus-visible, .sb-workflow-card:focus-visible, .sb-workflow-step:focus-visible { outline: 2px solid #059669; outline-offset: 4px; }

        .sb-workflow-center { min-width: 0; z-index: 10; transform: translateX(-40px); }
        .sb-workflow-viewport { position: relative; width: 100%; max-width: 570px; margin: 0 auto; overflow: hidden; border: 1px solid rgb(229 231 235 / 0.9); border-radius: 16px; background: white; box-shadow: 0 24px 50px -22px rgb(17 24 39 / 0.18); transition: box-shadow 500ms ease, border-color 500ms ease; }
        .sb-workflow-viewport--open { border-color: #d1d5db; box-shadow: 0 28px 64px -22px rgb(17 24 39 / 0.24); }
        .sb-workflow-blueprint { position: absolute; inset: 0; opacity: 0.6; pointer-events: none; background-image: linear-gradient(to right, rgb(17 24 39 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(17 24 39 / 0.06) 1px, transparent 1px); background-size: 28px 28px; }
        .sb-workflow-canvas-header, .sb-workflow-canvas-footer { position: relative; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding-inline: 20px; color: #737373; font-family: ui-monospace, var(--font-sans), monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .sb-workflow-canvas-header { position: relative; min-height: 46px; border-bottom: 1px solid #f0f0ef; }
        .sb-workflow-window-controls { display: inline-flex; align-items: center; gap: 6px; }
        .sb-workflow-window-controls i { display: block; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 1px rgb(17 24 39 / 0.08) inset; }
        .sb-workflow-window-control--close { background: #ff5f57; }
        .sb-workflow-window-control--minimize { background: #febc2e; }
        .sb-workflow-window-control--maximize { background: #28c840; }
        .sb-workflow-window-title { position: absolute; left: 50%; color: #737373; font-family: var(--font-sans), Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; text-transform: none; transform: translateX(-50%); white-space: nowrap; }
        .sb-workflow-canvas-header strong { color: #047857; font-weight: 800; }
        .sb-workflow-stage { position: relative; height: 405px; display: flex; align-items: center; justify-content: center; perspective: 1400px; perspective-origin: 50% 45%; }
        .sb-workflow-viewport--open .sb-workflow-stage { height: 910px; }
        .sb-workflow-annotation { position: absolute; z-index: 40; top: 8px; right: 20px; display: flex; flex-direction: column; align-items: center; color: #374151; font-family: var(--font-display), Georgia, serif; font-size: 20px; font-style: italic; letter-spacing: 0.03em; line-height: 0.95; pointer-events: none; transform: rotate(2deg); }
        .sb-workflow-annotation svg { margin-top: 4px; margin-left: 8px; color: #6b7280; }
        .sb-workflow-deck-size { position: relative; width: min(385px, calc(100% - 28px)); height: 270px; transform-style: preserve-3d; }
        .sb-workflow-platter { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 300ms ease-out; }
        .sb-workflow-platter--open { z-index: 3; }
        .sb-workflow-card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; width: 100%; min-width: 0; border: 1px solid rgb(229 231 235 / 0.9); border-radius: 16px; padding: 20px; cursor: grab; background: white; color: #111827; text-align: left; box-shadow: 0 24px 48px -12px rgb(17 24 39 / 0.12), 0 10px 20px -8px rgb(0 0 0 / 0.06), 0 0 0 1px rgb(255 255 255 / 0.9) inset, 0 1px 2px rgb(0 0 0 / 0.05); transform-style: preserve-3d; touch-action: none; transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease, filter 300ms ease; will-change: transform; }
        .sb-workflow-card:hover { box-shadow: 0 28px 54px -12px rgb(17 24 39 / 0.16), 0 0 0 1px rgb(255 255 255 / 0.9) inset; }
        .sb-workflow-card--open { box-shadow: 0 30px 58px -12px rgb(17 24 39 / 0.2), 0 0 0 1px rgb(255 255 255 / 0.9) inset, 0 0 0 1px rgb(17 24 39 / 0.08); }
        .sb-workflow-card--open[aria-pressed="true"] { border-color: #64748b; box-shadow: 0 20px 40px -16px rgb(17 24 39 / 0.22), 0 0 0 2px rgb(100 116 139 / 0.2); }
        .sb-workflow-card--dragging { cursor: grabbing !important; filter: brightness(1.02); box-shadow: 0 30px 60px -10px rgb(17 24 39 / 0.2) !important; transition: none !important; }
        .sb-workflow-card-header, .sb-workflow-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #f0f0ef; padding-bottom: 10px; font-family: ui-monospace, var(--font-sans), monospace; font-size: 10px; font-weight: 700; letter-spacing: -0.02em; }
        .sb-workflow-card-header--docs { padding-bottom: 12px; }
        .sb-workflow-card-footer { border-top: 1px solid #f0f0ef; border-bottom: 0; padding-top: 9px; padding-bottom: 0; color: #a3a3a3; font-size: 9px; font-weight: 400; }
        .sb-workflow-card-footer strong { font-weight: 800; }
        .sb-workflow-row { display: inline-flex; align-items: center; gap: 8px; }
        .sb-workflow-mini-icon { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 6px; }
        .sb-workflow-mini-icon--idea { background: #fffbeb; color: #d97706; }
        .sb-workflow-mini-icon--system { background: #eff6ff; color: #2563eb; }
        .sb-workflow-faint { color: #a3a3a3; font-size: 9px; font-weight: 400; }
        .sb-workflow-idea-body, .sb-workflow-system-body, .sb-workflow-docs-body { display: flex; flex: 1; flex-direction: column; justify-content: center; min-height: 0; padding-block: 10px; }
        .sb-workflow-root { display: inline-flex; align-items: center; align-self: center; gap: 6px; margin-bottom: 16px; border: 1px solid #d4d4d4; border-radius: 12px; padding: 6px 14px; background: #fafafa; font-size: 11px; font-weight: 800; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); }
        .sb-workflow-branches { width: 144px; height: 16px; align-self: center; border-top: 2px solid #d4d4d4; border-right: 2px solid #d4d4d4; border-left: 2px solid #d4d4d4; border-radius: 4px 4px 0 0; }
        .sb-workflow-idea-children, .sb-workflow-services { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-inline: 24px; }
        .sb-workflow-idea-children span { border: 1px dashed #d4d4d4; border-radius: 8px; padding: 5px 8px; background: rgb(250 250 250 / 0.7); color: #525252; font-size: 10px; font-weight: 600; text-align: center; }
        .sb-workflow-system-body { gap: 12px; }
        .sb-workflow-system-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-inline: 12px; }
        .sb-workflow-client, .sb-workflow-gateway { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 5px 10px; font-family: ui-monospace, var(--font-sans), monospace; font-size: 10px; font-weight: 700; }
        .sb-workflow-client { background: #111827; color: white; }
        .sb-workflow-gateway { border: 1px solid #a7f3d0; background: #ecfdf5; color: #064e3b; }
        .sb-workflow-protocol { color: #a3a3a3; font-family: ui-monospace, var(--font-sans), monospace; font-size: 9px; white-space: nowrap; }
        .sb-workflow-bus { position: relative; height: 1px; margin-inline: 12px; background: #e5e5e5; text-align: center; }
        .sb-workflow-bus span { position: relative; top: -7px; padding-inline: 6px; background: white; color: #a3a3a3; font-family: ui-monospace, var(--font-sans), monospace; font-size: 8px; }
        .sb-workflow-services { gap: 12px; }
        .sb-workflow-services span { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px; background: rgb(250 250 250 / 0.8); font-family: ui-monospace, var(--font-sans), monospace; font-size: 10px; font-weight: 700; }
        .sb-workflow-services .sb-workflow-dot { width: 6px; height: 6px; }
        .sb-workflow-docs-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; color: #a3a3a3; font-family: ui-monospace, var(--font-sans), monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; }
        .sb-workflow-file { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 5px 10px; background: #f5f5f5; color: #262626; }
        .sb-workflow-category { margin-bottom: 4px; color: #059669; font-family: ui-monospace, var(--font-sans), monospace; font-size: 9px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
        .sb-workflow-docs-title { margin-bottom: 14px; color: #030712; font-size: 22px; font-weight: 800; letter-spacing: -0.06em; line-height: 1.1; }
        .sb-workflow-callout { display: flex; align-items: center; gap: 8px; border: 1px solid #d1fae5; border-radius: 12px; padding: 10px; background: rgb(236 253 245 / 0.7); color: #064e3b; font-size: 10px; font-weight: 600; }

        .sb-workflow-canvas-footer { min-height: 53px; border-top: 1px solid #f0f0ef; text-transform: none; letter-spacing: 0; }
        .sb-workflow-thread { display: inline-flex; min-width: 0; align-items: center; gap: 8px; font-size: 10px; }
        .sb-workflow-exploring { color: #a3a3a3; font-family: ui-monospace, var(--font-sans), monospace; }
        .sb-workflow-thread strong { overflow: hidden; color: #171717; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .sb-workflow-view-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-shrink: 0; min-height: 36px; margin-left: 8px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 9px; background: white; color: #475569; font-family: var(--font-sans), Arial, sans-serif; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; }
        .sb-workflow-view-toggle:hover { background: #f8fafc; }
        .sb-workflow-view-toggle:focus-visible { outline: 2px solid #64748b; outline-offset: 3px; }
        .sb-workflow-pulse { animation: sb-workflow-pulse 2.5s infinite ease-in-out; }
        @keyframes sb-workflow-pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }

        .sb-workflow-steps { z-index: 20; min-width: 0; padding-left: 8px; font-family: var(--font-sans), Arial, sans-serif; }
        .sb-workflow-steps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgb(229 231 235 / 0.6); padding: 0 0 12px; font-family: var(--font-sans), Arial, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .sb-workflow-live { display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; color: #059669; font-family: var(--font-sans), Arial, sans-serif; font-size: 10px; }
        .sb-workflow-step-list { margin: 0; padding: 0; list-style: none; }
        .sb-workflow-step-list li { position: relative; }
        .sb-workflow-step { position: relative; display: grid; grid-template-columns: 38px 42px minmax(0, 1fr); width: 100%; align-items: start; gap: 14px; border: 1px solid transparent; border-radius: 16px; padding: 16px; cursor: pointer; background: transparent; color: #111827; font-family: var(--font-sans), Arial, sans-serif; text-align: left; transition: background-color 300ms ease, border-color 300ms ease, transform 300ms ease; }
        .sb-workflow-step:hover { border-color: #e5e7eb; background: rgb(255 255 255 / 0.8); }
        .sb-workflow-step--active { border-color: rgb(229 231 235 / 0.9); background: white; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); transform: translateX(2px); }
        .sb-workflow-step-bar { position: absolute; top: 12px; bottom: 12px; left: -1px; width: 4px; border-radius: 0 4px 4px 0; background: #059669; opacity: 0; transition: opacity 220ms ease; }
        .sb-workflow-step--active .sb-workflow-step-bar { opacity: 1; }
        .sb-workflow-step-number { padding-top: 5px; color: #a3a3a3; font-family: var(--font-sans), Arial, sans-serif; font-size: 14px; font-weight: 700; }
        .sb-workflow-step--active .sb-workflow-step-number { color: #047857; }
        .sb-workflow-step-icon { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid #e5e7eb; border-radius: 50%; background: white; color: #374151; }
        .sb-workflow-step--active .sb-workflow-step-icon { border-color: #111827; background: #111827; color: white; box-shadow: 0 1px 2px rgb(0 0 0 / 0.1); }
        .sb-workflow-step-copy { min-width: 0; }
        .sb-workflow-step-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #111827; font-size: 15px; font-weight: 800; letter-spacing: -0.035em; }
        .sb-workflow-step-title svg { flex: 0 0 auto; color: #a3a3a3; }
        .sb-workflow-step--active .sb-workflow-step-title svg { color: #059669; }
        .sb-workflow-step-description { display: block; margin-top: 5px; color: #64748b; font-size: 13px; line-height: 1.45; }
        .sb-workflow-helper { display: flex; align-items: center; gap: 7px; margin: 20px 0 0; color: #64748b; font-family: var(--font-sans), Arial, sans-serif; font-size: 13px; }

        @media (max-width: 1100px) {
          .sb-workflow-center { transform: none; }
          .sb-workflow-grid { grid-template-columns: minmax(230px, 0.8fr) minmax(430px, 1.1fr); }
          .sb-workflow-steps { grid-column: 1 / -1; padding: 24px 0 0; }
          .sb-workflow-step-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .sb-workflow-step { height: 100%; }
        }
        @media (max-width: 760px) {
          .sb-workflow-main { min-height: 0; padding-block: 60px 80px; }
          .sb-workflow-grid { grid-template-columns: 1fr; gap: 48px; }
          .sb-workflow-copy { max-width: 540px; padding: 0; }
          .sb-workflow-copy h2 { font-size: clamp(48px, 13vw, 70px); }
          .sb-workflow-description { max-width: 410px; }
          .sb-workflow-center { order: 2; }
          .sb-workflow-steps { order: 3; }
          .sb-workflow-stage { height: 380px; }
          .sb-workflow-step-list { display: flex; flex-direction: column; }
        }
        @media (max-width: 480px) {
          .sb-workflow-main { padding-inline: 14px; }
          .sb-workflow-actions { align-items: stretch; flex-direction: column; }
          .sb-workflow-explore, .sb-workflow-demo { width: 100%; }
          .sb-workflow-demo-controls { width: 100%; }
          .sb-workflow-demo-controls .sb-workflow-demo { width: auto; flex: 1; }
          .sb-workflow-canvas-header, .sb-workflow-canvas-footer { padding-inline: 12px; }
          .sb-workflow-canvas-header { font-size: 8px; }
          .sb-workflow-stage { height: 350px; }
          .sb-workflow-card { padding: 14px; }
          .sb-workflow-card-header, .sb-workflow-card-footer { font-size: 8px; }
          .sb-workflow-faint { font-size: 7px; }
          .sb-workflow-system-top { gap: 4px; padding-inline: 4px; }
          .sb-workflow-client, .sb-workflow-gateway { padding: 4px 6px; font-size: 8px; }
          .sb-workflow-protocol { font-size: 7px; }
          .sb-workflow-idea-children, .sb-workflow-services { gap: 6px; padding-inline: 4px; }
          .sb-workflow-docs-title { font-size: 18px; }
          .sb-workflow-docs-meta { font-size: 7px; }
          .sb-workflow-file { padding: 4px 6px; }
          .sb-workflow-thread { flex: 1; overflow: hidden; }
          .sb-workflow-thread strong { max-width: 160px; }
          .sb-workflow-exploring { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-workflow *, .sb-workflow *::before, .sb-workflow *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
          .sb-workflow-platter { transition: none; }
        }
      `}</style>
    </section>
  );
}

export default WorkflowShowcase;
