'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Link2,
  MousePointer2,
  Play,
  Plus,
  Sparkles,
  TextCursorInput,
  Volume2,
  VolumeX,
} from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';

type StageId = 1 | 2 | 3;

type Stage = {
  id: StageId;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const STAGES: Stage[] = [
  {
    id: 1,
    label: '01 / PROMPT INTENT',
    title: 'Tell it what you mean',
    description: 'Start with a sentence, a messy brief, or the question your team keeps circling.',
    icon: Sparkles,
  },
  {
    id: 2,
    label: '02 / SHAPE THE SYSTEM',
    title: 'Shape the system',
    description: 'Let AI turn the intent into connected objects you can edit, move, and interrogate.',
    icon: Layers3,
  },
  {
    id: 3,
    label: '03 / DECISIONS & COLLAB',
    title: 'Keep the conversation moving',
    description: 'Share the canvas, capture the decision, and leave with something the team can use.',
    icon: Play,
  },
];

const PROMPT_PHRASES = [
  'Create a system to manage user auth & multi-tenant billing',
  'Diagram the API gateway with edge caching and rate limits',
  'Map out microservices for order checkout & payment hooks',
  'Design real-time collaboration with WebSockets and Redis',
];

type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function stageFromProgress(progress: number): StageId {
  if (progress >= 0.66) return 3;
  if (progress >= 0.33) return 2;
  return 1;
}

function avatar(initial: string, tone: string) {
  return <span className={`closing-workflow-avatar ${tone}`} aria-hidden="true">{initial}</span>;
}

export function ClosingSystemSection() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeStage = stageFromProgress(progress);
  const activeStep = STAGES[activeStage - 1];

  const playTone = (frequency: number, duration = 0.16) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    const Constructor = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
    if (!Constructor) return;
    const context = audioContextRef.current ?? new Constructor();
    audioContextRef.current = context;
    if (context.state === 'suspended') void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.15, now + duration);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  const handleCardGrab = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    // The nested canvas controls already have their own cues. Only play the
    // grab sound for the card surface, avoiding two sounds on a button click.
    const target = event.target;
    if (target instanceof Element && target.closest('button, input, a')) return;
    playTone(460, 0.12);
  };

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedPrompt(PROMPT_PHRASES[0]);
      return;
    }

    let character = 0;
    let deleting = false;
    let timeout: number;
    const tick = () => {
      const phrase = PROMPT_PHRASES[phraseIndex];
      if (deleting) character -= 1;
      else character += 1;
      setTypedPrompt(phrase.slice(0, character));
      if (!deleting && character >= phrase.length) {
        deleting = true;
        timeout = window.setTimeout(tick, 1800);
        return;
      }
      if (deleting && character <= 0) {
        deleting = false;
        setPhraseIndex((index) => (index + 1) % PROMPT_PHRASES.length);
        timeout = window.setTimeout(tick, 450);
        return;
      }
      timeout = window.setTimeout(tick, deleting ? 28 : 58);
    };
    timeout = window.setTimeout(tick, 650);
    return () => window.clearTimeout(timeout);
  }, [phraseIndex, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    // One update per step, not per scroll frame. Manual selection/scrubbing
    // restarts this delay so visitors have time to inspect their chosen stage.
    const timeout = window.setTimeout(() => {
      setProgress((current) => {
        const stage = stageFromProgress(current);
        return stage === 1 ? 0.5 : stage === 2 ? 1 : 0;
      });
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [progress, prefersReducedMotion]);

  const jumpToStage = (stage: StageId) => {
    const nextProgress = stage === 1 ? 0 : stage === 2 ? 0.5 : 1;
    setProgress(nextProgress);
    playTone(550 + stage * 120, 0.2);
  };

  const stepStage = (direction: -1 | 1) => {
    const next = Math.max(1, Math.min(3, activeStage + direction)) as StageId;
    jumpToStage(next);
  };

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    const nextProgress = Number(event.target.value) / 1000;
    setProgress(nextProgress);
  };

  const promptAmount = clamp(progress / 0.5);
  const canvasAmount = clamp((progress - 0.15) / 0.5);
  const feedAmount = clamp((progress - 0.5) / 0.5);
  const promptStyle: CSSProperties = {
    transform: `translate3d(${lerp(0, -60, promptAmount)}px, ${lerp(0, -25, promptAmount)}px, 0) rotate(${lerp(-3, -7, promptAmount)}deg) scale(${lerp(1, 0.9, promptAmount)})`,
    opacity: lerp(1, 0.75, clamp(progress / 0.6)),
  };
  const canvasStyle: CSSProperties = {
    transform: `perspective(1000px) translate3d(0, ${lerp(40, -10, canvasAmount)}px, 0) rotateX(${lerp(-14, -2, canvasAmount)}deg) rotateY(${lerp(12, 4, canvasAmount)}deg) scale(${lerp(0.92, 1.06, canvasAmount)})`,
    opacity: lerp(0.7, 1, canvasAmount),
  };
  const feedStyle: CSSProperties = {
    transform: `translate3d(0, ${lerp(70, 0, feedAmount)}px, 0) rotate(${lerp(8, 0, feedAmount)}deg) scale(${lerp(0.85, 1.04, feedAmount)})`,
    opacity: lerp(0.25, 1, feedAmount),
  };

  return (
    <div className="closing-workflow-track relative" id="how-it-works">
      <section
        className="closing-workflow-section relative isolate min-h-[100dvh] overflow-hidden bg-[var(--landing-background,#faf9f6)] px-6 pb-5 pt-5 text-neutral-900 sm:px-12 lg:px-16"
        aria-labelledby="closing-workflow-title"
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      >
      <div className="closing-workflow-content relative z-10 mx-auto flex min-h-[calc(100dvh-40px)] max-w-[1520px] flex-col justify-between">
        <div className="closing-workflow-main grid flex-1 grid-cols-1 items-center gap-8 py-10 lg:grid-cols-12 lg:gap-6 lg:py-4">
          <div className="closing-workflow-copy z-40 lg:col-span-5 lg:pr-8">
            <div className="closing-workflow-eyebrow"><span /> From thought to shared understanding</div>
            <h2 id="closing-workflow-title">A better first draft<br /><em>for every system.</em></h2>
            <p>Turn your ideas into clear diagrams, documents and decisions — together, in one visual space.</p>
            <div className="closing-workflow-actions">
              <button type="button" onClick={() => jumpToStage(2)} className="closing-workflow-primary group">Explore the workflow <ArrowUpRight size={17} aria-hidden="true" /></button>
              <div className="closing-workflow-hud">
                <div className="closing-workflow-stage-nav" role="group" aria-label="Workflow stages">
                  {STAGES.map((stage) => (
                    <button key={stage.id} type="button" className={activeStage === stage.id ? 'is-active' : ''} onClick={() => jumpToStage(stage.id)} aria-pressed={activeStage === stage.id}>{stage.id.toString().padStart(2, '0')} {stage.title === 'Tell it what you mean' ? 'Intent' : stage.id === 2 ? 'Architecture' : 'Decisions'}</button>
                  ))}
                </div>
                <button type="button" className="closing-workflow-hud-button" onClick={() => { if (audioEnabled) playTone(420); setAudioEnabled((enabled) => !enabled); }} aria-pressed={audioEnabled} aria-label={audioEnabled ? 'Mute audio cues' : 'Enable audio cues'}>
                  {audioEnabled ? <Volume2 size={13} className="text-emerald-600" aria-hidden="true" /> : <VolumeX size={13} className="text-neutral-500" aria-hidden="true" />}
                  <span className="hidden sm:inline">{audioEnabled ? 'Audio cues' : 'Muted'}</span>
                </button>
              </div>
            </div>
            <div className="closing-workflow-proof">
              <div className="closing-workflow-avatars">{avatar('A', 'avatar-mint')}{avatar('R', 'avatar-blue')}{avatar('M', 'avatar-sand')}</div>
              <span>Used by <strong>10K+</strong> builders, teams and creators.</span>
            </div>
          </div>

          <div className="closing-workflow-stage relative z-30 h-[620px] w-full preserve-3d lg:col-span-7" aria-label="Interactive workflow stage">
            <svg className="closing-workflow-stage-spline" viewBox="0 0 700 620" preserveAspectRatio="none" aria-hidden="true">
              <path className="closing-workflow-stage-spline-base" d="M 34 52 C 18 150, 38 208, 128 270 C 212 328, 224 408, 204 565" />
              <path className="closing-workflow-stage-spline-core" d="M 34 52 C 18 150, 38 208, 128 270 C 212 328, 224 408, 204 565" />
              <circle cx="34" cy="52" r="5" />
              <circle cx="128" cy="270" r="5" />
              <circle cx="204" cy="565" r="5" />
            </svg>
            <button type="button" className={`closing-workflow-step-card closing-workflow-step-one ${activeStage === 1 ? 'is-active' : ''}`} onClick={() => jumpToStage(1)} aria-pressed={activeStage === 1}>
              <span className="closing-workflow-step-number">01</span><span className="closing-workflow-step-icon"><Sparkles size={16} aria-hidden="true" /></span><span><strong>{STAGES[0].title}</strong><small>{STAGES[0].description}</small></span>
            </button>
            <button type="button" className={`closing-workflow-step-card closing-workflow-step-two ${activeStage === 2 ? 'is-active' : ''}`} onClick={() => jumpToStage(2)} aria-pressed={activeStage === 2}>
              <span className="closing-workflow-step-number">02</span><span className="closing-workflow-step-icon"><Layers3 size={16} aria-hidden="true" /></span><span><strong>{STAGES[1].title}</strong><small>{STAGES[1].description}</small></span>
            </button>
            <button type="button" className={`closing-workflow-step-card closing-workflow-step-three ${activeStage === 3 ? 'is-active' : ''}`} onClick={() => jumpToStage(3)} aria-pressed={activeStage === 3}>
              <span className="closing-workflow-step-number">03</span><span className="closing-workflow-step-icon"><Play size={16} aria-hidden="true" /></span><span><strong>{STAGES[2].title}</strong><small>{STAGES[2].description}</small></span>
            </button>

            <div className="closing-workflow-component closing-workflow-prompt" style={promptStyle} onPointerDown={handleCardGrab}>
              <div className="closing-workflow-panel">
                <div className="closing-workflow-panel-label"><i /><span>A messy idea...</span></div>
                <div className="closing-workflow-input"><span>{typedPrompt}</span><span className="closing-workflow-caret" /><button type="button" onClick={() => playTone(700, 0.2)} aria-label="Send idea"><ArrowUpRight size={14} aria-hidden="true" /></button></div>
              </div>
            </div>

            <div className="closing-workflow-component closing-workflow-canvas-card" style={canvasStyle} onPointerDown={handleCardGrab}>
              <div className="closing-workflow-panel closing-workflow-blueprint">
                <div className="closing-workflow-blueprint-grid" aria-hidden="true" />
                <div className="closing-workflow-tool-dock" aria-label="Canvas tools">
                  <button type="button" className="is-selected" onClick={() => playTone(620)} aria-label="Select tool"><MousePointer2 size={13} aria-hidden="true" /></button>
                  <button type="button" onClick={() => playTone(680)} aria-label="Text tool"><TextCursorInput size={13} aria-hidden="true" /></button>
                  <button type="button" onClick={() => playTone(740)} aria-label="Connect tool"><Link2 size={13} aria-hidden="true" /></button>
                  <button type="button" onClick={() => playTone(800)} aria-label="Add object"><Plus size={13} aria-hidden="true" /></button>
                </div>
                <svg className="closing-workflow-blueprint-wires" viewBox="0 0 480 340" aria-hidden="true"><path d="M280 60C230 60 180 110 150 140M300 80V190M330 210C360 210 390 190 410 170" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 6" /></svg>
                <button type="button" className="closing-workflow-node closing-workflow-node-architecture" onClick={() => playTone(880, 0.25)}><i />Architecture</button>
                <button type="button" className="closing-workflow-node closing-workflow-node-database" onClick={() => playTone(580, 0.25)}>Database</button>
                <button type="button" className="closing-workflow-node closing-workflow-node-api" onClick={() => playTone(740, 0.25)}>API</button>
                <button type="button" className="closing-workflow-node closing-workflow-node-client" onClick={() => playTone(660, 0.2)}><i />Client</button>
                <span className="closing-workflow-live-cursor" aria-hidden="true"><ArrowUpRight size={20} /><small>You</small></span>
              </div>
            </div>

            <div className="closing-workflow-component closing-workflow-feed" style={feedStyle} onPointerDown={handleCardGrab}>
              <div className="closing-workflow-panel">
                <div className="closing-workflow-feed-row">{avatar('R', 'avatar-neutral')}<span>Looks good!</span><small>2m ago</small></div>
                <div className="closing-workflow-feed-row">{avatar('A', 'avatar-blue')}<span>Let&apos;s refine this section.</span><small>5m ago</small></div>
                <div className="closing-workflow-feed-row">{avatar('K', 'avatar-sand')}<strong>Updated the flow.</strong><small>8m ago</small></div>
              </div>
            </div>
          </div>
        </div>

        <footer className="closing-workflow-scrubber">
          <label htmlFor="closing-workflow-progress">Scrub: <input id="closing-workflow-progress" type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={handleScrub} aria-label="Scrub workflow progress" /></label>
          <span className="closing-workflow-percent">{Math.round(progress * 100)}%</span>
          <span className="closing-workflow-readout">ACTIVE STAGE: <strong>{activeStep.label}</strong></span>
          <span className="closing-workflow-stepper"><button type="button" onClick={() => stepStage(-1)} aria-label="Previous workflow stage"><ChevronLeft size={14} /></button><button type="button" onClick={() => stepStage(1)} aria-label="Next workflow stage"><ChevronRight size={14} /></button></span>
          <Link href="/dashboard" className="sr-only">Launch ScribeBoard</Link>
        </footer>
      </div>
      </section>
    </div>
  );
}

export default ClosingSystemSection;
