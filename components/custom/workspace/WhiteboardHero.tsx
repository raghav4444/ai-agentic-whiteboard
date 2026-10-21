'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RotateCcw, Volume2, VolumeX } from '@/lib/icons';
import { Caveat } from 'next/font/google';

const handwriting = Caveat({
  subsets: ['latin'],
  weight: '500',
  display: 'swap',
  variable: '--font-hero-handwriting',
});

type Tool =
  | { kind: 'marker'; color: string; label: string }
  | { kind: 'duster'; label: string };

type Point = { x: number; y: number };

type Stroke = {
  kind: Tool['kind'];
  color?: string;
  points: Point[];
  inscription?: { text: string; size: number; angle: number };
  // Normalized dimensions keep the erased area attached to the drawing when
  // the responsive canvas is resized and its stroke history is replayed.
  eraserSize?: { width: number; height: number };
};

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const MARKERS = [
  { color: '#111111', label: 'Black Pen', className: 'marker-black' },
  { color: '#1d4ed8', label: 'Blue Pen', className: 'marker-blue' },
  { color: '#25a266', label: 'Green Pen', className: 'marker-green' },
  { color: '#dc2626', label: 'Red Pen', className: 'marker-red' },
] as const;

const INITIAL_TOOL: Tool = {
  kind: 'marker',
  color: MARKERS[0].color,
  label: MARKERS[0].label,
};

// Draw the handwritten invitation into the actual canvas, not a DOM overlay,
// so the visitor can erase it and make the space their own.
const INITIAL_STROKES: Stroke[] = [
  {
    kind: 'marker',
    color: '#111111',
    points: [{ x: 0.12, y: 0.28 }],
    inscription: { text: 'Pick up a pen.', size: 0.115, angle: -3 },
  },
  {
    kind: 'marker',
    color: '#111111',
    points: [{ x: 0.16, y: 0.42 }],
    inscription: { text: 'Show us what', size: 0.1, angle: -1.5 },
  },
  {
    kind: 'marker',
    color: '#065f46',
    points: [{ x: 0.2, y: 0.56 }],
    inscription: { text: 'you can do.', size: 0.115, angle: -2 },
  },
  // A loose underline and arrow add the quick whiteboard feel.
  {
    kind: 'marker',
    color: '#25a266',
    points: [
      { x: 0.19, y: 0.62 },
      { x: 0.27, y: 0.63 },
      { x: 0.4, y: 0.62 },
      { x: 0.52, y: 0.625 },
      { x: 0.65, y: 0.61 },
    ],
  },
  {
    kind: 'marker',
    color: '#25a266',
    points: [
      { x: 0.61, y: 0.58 },
      { x: 0.66, y: 0.61 },
      { x: 0.615, y: 0.65 },
    ],
  },
];

const INTRO_STROKE_GAP = 560;
const INTRO_STROKE_DURATION = 700;

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function introStrokeProgress(index: number, elapsed: number) {
  return clampUnit((elapsed - index * INTRO_STROKE_GAP) / INTRO_STROKE_DURATION);
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  handwritingFont = 'cursive',
  progress = 1,
) {
  const [firstPoint] = stroke.points;
  if (!firstPoint) return;

  context.save();
  context.globalCompositeOperation =
    stroke.kind === 'duster' ? 'destination-out' : 'source-over';
  context.strokeStyle = stroke.color ?? '#fdf8ec';
  context.fillStyle = stroke.color ?? '#fdf8ec';
  context.lineWidth = stroke.kind === 'duster' ? 40 : 3.2;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const toCanvasPoint = (point: Point) => ({
    x: point.x * width,
    y: point.y * height,
  });
  const start = toCanvasPoint(firstPoint);

  const strokeProgress = clampUnit(progress);
  if (strokeProgress <= 0) {
    context.restore();
    return;
  }

  if (stroke.inscription) {
    context.translate(start.x, start.y);
    context.rotate(stroke.inscription.angle * Math.PI / 180);
    const fontSize = stroke.inscription.size * height;
    context.font = `500 ${fontSize}px ${handwritingFont}`;
    context.textBaseline = 'alphabetic';
    if (strokeProgress < 1) {
      const textWidth = context.measureText(stroke.inscription.text).width;
      context.beginPath();
      context.rect(-2, -fontSize * 1.1, textWidth * strokeProgress + 4, fontSize * 1.35);
      context.clip();
    }
    context.fillText(stroke.inscription.text, 0, 0);
    context.restore();
    return;
  }

  if (stroke.kind === 'duster' && stroke.eraserSize) {
    const eraserWidth = stroke.eraserSize.width * width;
    const eraserHeight = stroke.eraserSize.height * height;
    const stamp = (point: Point) => {
      context.save();
      context.translate(point.x, point.y);
      // Match the centered, -8 degree visual duster rather than a narrow circle.
      context.rotate(-8 * Math.PI / 180);
      context.fillRect(-eraserWidth / 2, -eraserHeight / 2, eraserWidth, eraserHeight);
      context.restore();
    };

    stamp(start);
    let previous = start;
    const spacing = Math.max(1, Math.min(eraserWidth, eraserHeight) / 4);
    for (const point of stroke.points.slice(1)) {
      const next = toCanvasPoint(point);
      const steps = Math.max(1, Math.ceil(Math.hypot(next.x - previous.x, next.y - previous.y) / spacing));
      // Interpolate between events so fast swipes leave no gaps in the wipe.
      for (let step = 1; step <= steps; step += 1) {
        const amount = step / steps;
        stamp({
          x: previous.x + (next.x - previous.x) * amount,
          y: previous.y + (next.y - previous.y) * amount,
        });
      }
      previous = next;
    }
    context.restore();
    return;
  }

  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(
      start.x,
      start.y,
      Math.max(1.6, context.lineWidth / 2),
      0,
      Math.PI * 2,
    );
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(start.x, start.y);
    const segmentCount = stroke.points.length - 1;
    const visibleSegments = strokeProgress * segmentCount;
    const completeSegments = Math.floor(visibleSegments);
    for (let index = 1; index <= completeSegments; index += 1) {
      const next = toCanvasPoint(stroke.points[index]);
      context.lineTo(next.x, next.y);
    }
    if (completeSegments < segmentCount) {
      const from = toCanvasPoint(stroke.points[completeSegments]);
      const to = toCanvasPoint(stroke.points[completeSegments + 1]);
      const amount = visibleSegments - completeSegments;
      context.lineTo(from.x + (to.x - from.x) * amount, from.y + (to.y - from.y) * amount);
    }
    context.stroke();
  }

  context.restore();
}

export function WhiteboardHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLImageElement>(null);
  const dusterRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeToolRef = useRef<Tool>(INITIAL_TOOL);
  const currentStrokeRef = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const writingAudioRef = useRef<HTMLAudioElement | null>(null);
  const cleaningAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(true);
  const introFrameRef = useRef<number | null>(null);
  const introActiveRef = useRef(false);
  const introElapsedRef = useRef(Number.POSITIVE_INFINITY);

  const [activeTool, setActiveTool] = useState<Tool>(INITIAL_TOOL);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playSound = useCallback((type: 'draw' | 'wipe' | 'click') => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;

    const AudioContextConstructor =
      window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    if (context.state === 'suspended') void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = type === 'wipe' ? 0.12 : type === 'draw' ? 0.045 : 0.07;

    oscillator.type = type === 'draw' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(
      type === 'wipe' ? 170 : type === 'click' ? 620 : 240,
      now,
    );
    if (type === 'wipe') {
      oscillator.frequency.exponentialRampToValueAtTime(90, now + duration);
    }
    gain.gain.setValueAtTime(type === 'draw' ? 0.012 : 0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }, []);

  const startWritingSound = useCallback(() => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;

    const audio = writingAudioRef.current ?? new Audio('/writing-with-pencil.mp3');
    if (!writingAudioRef.current) {
      audio.loop = true;
      audio.volume = 0.34;
      writingAudioRef.current = audio;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers can reject playback if the gesture has already ended.
    });
  }, []);

  const stopWritingSound = useCallback(() => {
    const audio = writingAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const startCleaningSound = useCallback(() => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;

    const audio = cleaningAudioRef.current ?? new Audio('/cleaning.mp3');
    if (!cleaningAudioRef.current) {
      audio.loop = true;
      audio.volume = 0.4;
      cleaningAudioRef.current = audio;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers can reject playback if the gesture has already ended.
    });
  }, []);

  const stopCleaningSound = useCallback(() => {
    const audio = cleaningAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const showPenAt = useCallback((point: Point) => {
    const pen = penRef.current;
    if (!pen) return;
    pen.style.left = `${point.x * 100}%`;
    pen.style.top = `${point.y * 100}%`;
    pen.style.opacity = '1';
  }, []);

  const hidePen = useCallback(() => {
    if (penRef.current) penRef.current.style.opacity = '0';
  }, []);

  const showDusterAt = useCallback((point: Point) => {
    const duster = dusterRef.current;
    if (!duster) return;
    duster.style.left = `${point.x * 100}%`;
    duster.style.top = `${point.y * 100}%`;
    duster.style.opacity = '1';
  }, []);

  const hideDuster = useCallback(() => {
    if (dusterRef.current) dusterRef.current.style.opacity = '0';
  }, []);

  useEffect(() => {
    if (!soundEnabled) {
      stopWritingSound();
      stopCleaningSound();
    }
  }, [soundEnabled, stopCleaningSound, stopWritingSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let canvasWidth = 1;
    let canvasHeight = 1;
    let devicePixelRatio = 1;
    let disposed = false;
    const handwritingFont = getComputedStyle(surface).getPropertyValue('--font-hero-handwriting').trim() || 'cursive';

    const render = () => {
      if (disposed) return;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      strokesRef.current.forEach((stroke, index) =>
        drawStroke(
          context,
          stroke,
          canvasWidth,
          canvasHeight,
          handwritingFont,
          introActiveRef.current ? introStrokeProgress(index, introElapsedRef.current) : 1,
        ),
      );
    };

    renderRef.current = render;
    // Canvas does not repaint itself when a font arrives. Load the self-hosted
    // handwriting face explicitly, then redraw the current (possibly erased) history.
    void document.fonts.load(`500 32px ${handwritingFont}`).then(render).catch(() => undefined);

    if (strokesRef.current.length === 0) {
      strokesRef.current = INITIAL_STROKES.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({ ...point })),
      }));
    }

    const completeIntro = () => {
      introActiveRef.current = false;
      introElapsedRef.current = Number.POSITIVE_INFINITY;
      if (introFrameRef.current !== null) {
        window.cancelAnimationFrame(introFrameRef.current);
        introFrameRef.current = null;
      }
      hidePen();
      render();
    };

    const resizeCanvas = () => {
      const bounds = surface.getBoundingClientRect();
      canvasWidth = Math.max(1, bounds.width);
      canvasHeight = Math.max(1, bounds.height);
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvasWidth * devicePixelRatio);
      canvas.height = Math.round(canvasHeight * devicePixelRatio);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      render();
    };

    const getPoint = (event: PointerEvent): Point => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
        y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
      };
    };

    const finishStroke = (event: PointerEvent) => {
      const currentStroke = currentStrokeRef.current;
      if (currentStroke?.pointerId !== event.pointerId) return;
      currentStrokeRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (currentStroke.stroke.kind === 'marker') {
        stopWritingSound();
        hidePen();
      } else {
        stopCleaningSound();
        hideDuster();
      }
      canvas.style.cursor = 'crosshair';
      playSound(currentStroke.stroke.kind === 'marker' ? 'draw' : 'wipe');
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      event.preventDefault();
      completeIntro();
      const tool = activeToolRef.current;
      const point = getPoint(event);
      const stroke: Stroke = {
        kind: tool.kind,
        color: tool.kind === 'marker' ? tool.color : undefined,
        points: [point],
        eraserSize: tool.kind === 'duster' ? {
          width: (dusterRef.current?.offsetWidth || 100) / Math.max(1, surface.clientWidth),
          height: (dusterRef.current?.offsetHeight || 38) / Math.max(1, surface.clientHeight),
        } : undefined,
      };
      currentStrokeRef.current = { pointerId: event.pointerId, stroke };
      strokesRef.current.push(stroke);
      canvas.setPointerCapture(event.pointerId);
      render();
      if (stroke.kind === 'marker') {
        canvas.style.cursor = 'none';
        showPenAt(point);
        startWritingSound();
      } else {
        canvas.style.cursor = 'none';
        hidePen();
        showDusterAt(point);
        startCleaningSound();
      }
      playSound('click');
    };

    const handlePointerMove = (event: PointerEvent) => {
      const currentStroke = currentStrokeRef.current;
      if (!currentStroke || currentStroke.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = getPoint(event);
      currentStroke.stroke.points.push(point);
      if (currentStroke.stroke.kind === 'marker') {
        showPenAt(point);
      } else {
        showDusterAt(point);
      }
      render();
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(surface);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    const introStart = performance.now();
    const introTotal = (strokesRef.current.length - 1) * INTRO_STROKE_GAP + INTRO_STROKE_DURATION;
    introActiveRef.current = true;
    introElapsedRef.current = 0;

    const animateIntro = (time: number) => {
      if (disposed || !introActiveRef.current) return;
      const elapsed = time - introStart;
      introElapsedRef.current = elapsed;
      const activeIndex = Math.min(
        strokesRef.current.length - 1,
        Math.max(0, Math.floor(elapsed / INTRO_STROKE_GAP)),
      );
      const activeStroke = strokesRef.current[activeIndex];
      if (activeStroke) {
        showPenAt(activeStroke.points[0]);
      }
      render();
      if (elapsed < introTotal) {
        introFrameRef.current = window.requestAnimationFrame(animateIntro);
      } else {
        introActiveRef.current = false;
        introElapsedRef.current = Number.POSITIVE_INFINITY;
        introFrameRef.current = null;
        hidePen();
        render();
      }
    };

    resizeCanvas();
    introFrameRef.current = window.requestAnimationFrame(animateIntro);

    return () => {
      disposed = true;
      completeIntro();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', finishStroke);
      canvas.removeEventListener('pointercancel', finishStroke);
      currentStrokeRef.current = null;
      renderRef.current = null;
      stopWritingSound();
      stopCleaningSound();
      hidePen();
      hideDuster();
    };
  }, [
    hideDuster,
    hidePen,
    playSound,
    showDusterAt,
    showPenAt,
    startCleaningSound,
    startWritingSound,
    stopCleaningSound,
    stopWritingSound,
  ]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) void audioContextRef.current.close();
      stopWritingSound();
      stopCleaningSound();
      hidePen();
      hideDuster();
    };
  }, [hideDuster, hidePen, stopCleaningSound, stopWritingSound]);

  const chooseMarker = (marker: (typeof MARKERS)[number]) => {
    const tool: Tool = {
      kind: 'marker',
      color: marker.color,
      label: marker.label,
    };
    hideDuster();
    setActiveTool(tool);
    playSound('click');
  };

  const chooseDuster = () => {
    hidePen();
    setActiveTool({ kind: 'duster', label: 'Felt duster' });
    playSound('click');
  };

  const wipeBoard = () => {
    strokesRef.current = [];
    renderRef.current?.();
    stopCleaningSound();
    hideDuster();
    playSound('wipe');
  };

  return (
    <div className={`hero-whiteboard-frame relative mx-auto w-full max-w-[640px] px-1 pb-4 pt-3 ${handwriting.variable}`}>
        <section
          className="hero-mac-window relative w-full"
          aria-label="Interactive drawing canvas in a Mac-style window"
        >
          <div className="hero-mac-titlebar">
            <div className="hero-mac-traffic-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="hero-mac-title">Canvas / Workspace</span>
            <div className="hero-mac-status">
              <i aria-hidden="true" />
              <span>Live</span>
              <button
                type="button"
                className="ml-1 inline-flex min-h-7 min-w-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                onClick={() => setSoundEnabled((enabled) => !enabled)}
                aria-label={soundEnabled ? 'Mute board sounds' : 'Enable board sounds'}
                aria-pressed={soundEnabled}
                title={soundEnabled ? 'Mute board sounds' : 'Enable board sounds'}
              >
                {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>
            </div>
          </div>

          <div
            ref={surfaceRef}
            className="hero-mac-surface relative aspect-[5/4] w-full overflow-hidden"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-10 block h-full w-full cursor-crosshair touch-none"
              aria-label="Drawing surface. Use the selected marker or duster to sketch on the board."
              aria-describedby="whiteboard-help"
              tabIndex={0}
            />
            <img
              ref={penRef}
              src="/pen-removebg-preview.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute z-20 w-[clamp(88px,18vw,122px)] max-w-none select-none opacity-0 transition-opacity duration-100"
              style={{
                transform: 'translate(-23%, -81%)',
                filter: 'drop-shadow(2px 5px 4px rgba(20, 20, 20, 0.3))',
              }}
            />
            <div
              ref={dusterRef}
              aria-hidden="true"
              className="pointer-events-none absolute z-20 flex w-[clamp(72px,12vw,100px)] max-w-none select-none flex-col overflow-hidden rounded-[4px] border-[1.5px] border-black/80 opacity-0 transition-opacity duration-100"
              style={{
                transform: 'translate(-50%, -50%) rotate(-8deg)',
                filter: 'drop-shadow(2px 6px 5px rgba(20, 20, 20, 0.34))',
              }}
            >
              <span className="flex h-2.5 items-center justify-center bg-gradient-to-r from-[#2b2b2b] via-[#151515] to-[#090909]">
                <span className="h-0.5 w-10 rounded-full bg-stone-500/60" />
              </span>
              <span className="flex h-4 items-center justify-between border-t border-stone-400/50 bg-gradient-to-b from-[#f5f1e7] via-[#e3dccd] to-[#b9aa97] px-1.5 text-[5px] font-bold tracking-[0.08em] text-stone-600">
                FELT DUSTER
                <span className="flex gap-0.5">
                  <span className="h-0.5 w-0.5 rounded-full bg-stone-500" />
                  <span className="h-0.5 w-0.5 rounded-full bg-stone-500" />
                </span>
              </span>
            </div>
          </div>

          <div className="board-tray hero-mac-tools">
            <div className="tray-tools" role="toolbar" aria-label="Whiteboard tools">
              <div className="flex flex-col gap-2.5" role="group" aria-label="Pens">
                <span className="text-[10px] font-semibold leading-none text-neutral-500">Pens</span>
                <div className="flex min-h-6 flex-wrap items-center gap-2.5">
              {MARKERS.map((marker) => {
                const selected =
                  activeTool.kind === 'marker' && activeTool.color === marker.color;
                return (
                  <button
                    key={marker.color}
                    type="button"
                    className={`marker-prop tray-marker ${marker.className} ${selected ? 'active-tool' : ''}`}
                    style={{
                      background: 'linear-gradient(90deg, #111 0 18%, #292929 18% 86%, #111 86%)',
                    }}
                    onClick={() => chooseMarker(marker)}
                    aria-label={marker.label}
                    aria-pressed={selected}
                    title={marker.label}
                  />
                );
              })}
                </div>
              </div>
              <div className="flex flex-col gap-2.5" role="group" aria-label="Duster">
                <span className="text-[10px] font-semibold leading-none text-neutral-500">Duster</span>
                <div className="flex min-h-6 items-center">
              <button
                type="button"
                className={`felt-prop tray-duster ${activeTool.kind === 'duster' ? 'active-tool' : ''}`}
                style={{
                  background:
                    'linear-gradient(180deg, #f5f1e7 0%, #ddd4c5 55%, #b9aa97 100%)',
                }}
                onClick={chooseDuster}
                aria-label="Felt duster"
                aria-pressed={activeTool.kind === 'duster'}
                title="Felt duster"
              />
                </div>
              </div>
            </div>

            <div className="tray-actions flex items-center gap-2">
              <span className="tray-label hidden text-[9px] font-bold uppercase tracking-[0.08em] text-stone-700/80 sm:inline">
                {activeTool.label}
              </span>
              <button
                type="button"
                className="inline-flex min-h-7 items-center gap-1 rounded border border-stone-500/70 bg-stone-100/70 px-2 text-[10px] font-bold text-stone-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                onClick={wipeBoard}
                aria-label="Wipe the board"
              >
                <RotateCcw size={11} aria-hidden="true" />
                Wipe
              </button>
            </div>
          </div>
        </section>

      <p id="whiteboard-help" className="sr-only">
        The canvas starts with the handwritten invitation “Pick up a pen. Show us what you can do.” Select a marker or the felt
        duster from the toolbar and drag on the gridded canvas. Wipe clears all marks.
      </p>
    </div>
  );
}
