'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Eraser,
  MousePointer2,
  RotateCcw,
  Sparkles,
} from '@/lib/icons';

type Point = { x: number; y: number };
type Particle = { x: number; y: number; radius: number; speed: number; phase: number };
type CanvasTool = 'draw' | 'erase';

const MAX_STROKES = 7;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const strokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[] | null>(null);
  const pointerRef = useRef<Point>({ x: 0.5, y: 0.5 });
  const drawingRef = useRef(false);
  const toolRef = useRef<CanvasTool>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMarks, setHasMarks] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [tool, setTool] = useState<CanvasTool>('draw');
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const [eraserPosition, setEraserPosition] = useState<Point>({ x: 0.5, y: 0.5 });

  const chooseTool = (nextTool: CanvasTool) => {
    toolRef.current = nextTool;
    setTool(nextTool);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotion();
    mediaQuery.addEventListener('change', syncMotion);
    return () => mediaQuery.removeEventListener('change', syncMotion);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    let ratio = 1;
    let disposed = false;
    const particles: Particle[] = Array.from({ length: 22 }, (_, index) => ({
      x: (index * 0.173 + 0.08) % 1,
      y: (index * 0.317 + 0.11) % 1,
      radius: 1 + (index % 3) * 0.7,
      speed: 0.00006 + (index % 4) * 0.00002,
      phase: index * 0.7,
    }));

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    };

    const drawStroke = (stroke: Point[]) => {
      if (stroke.length === 0) return;
      context.beginPath();
      context.moveTo(stroke[0].x * width, stroke[0].y * height);
      stroke.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height));
      context.strokeStyle = '#0f764a';
      context.lineWidth = Math.max(2, width * 0.004);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke();
    };

    const draw = (time: number) => {
      if (disposed) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // Blueprint grid: quiet enough to feel like paper, alive enough to feel spatial.
      context.strokeStyle = 'rgba(15, 118, 74, 0.075)';
      context.lineWidth = 1;
      const grid = 28;
      for (let x = 0; x <= width; x += grid) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += grid) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      // A broken route line turns the missing page into an architectural object.
      const routeProgress = prefersReducedMotion ? 1 : (time * 0.00018) % 1;
      context.save();
      context.setLineDash([5, 9]);
      context.lineDashOffset = -routeProgress * 80;
      context.strokeStyle = 'rgba(15, 118, 74, 0.42)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(width * 0.11, height * 0.72);
      context.bezierCurveTo(width * 0.3, height * 0.68, width * 0.28, height * 0.29, width * 0.52, height * 0.35);
      context.bezierCurveTo(width * 0.7, height * 0.4, width * 0.67, height * 0.7, width * 0.88, height * 0.58);
      context.stroke();
      context.restore();

      particles.forEach((particle) => {
        const drift = prefersReducedMotion ? 0 : Math.sin(time * particle.speed + particle.phase) * 0.012;
        const x = particle.x * width;
        const y = ((particle.y + drift + (time * particle.speed) % 0.12) % 1) * height;
        const alpha = 0.22 + (Math.sin(time * 0.001 + particle.phase) + 1) * 0.08;
        context.fillStyle = `rgba(15, 118, 74, ${alpha})`;
        context.beginPath();
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      const target = pointerRef.current;
      context.fillStyle = 'rgba(15, 118, 74, 0.12)';
      context.beginPath();
      context.arc(target.x * width, target.y * height, 24, 0, Math.PI * 2);
      context.fill();

      strokesRef.current.forEach(drawStroke);
      if (activeStrokeRef.current) drawStroke(activeStrokeRef.current);
      frameRef.current = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frameRef.current = window.requestAnimationFrame(draw);
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [prefersReducedMotion]);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    const point = getPoint(event);
    pointerRef.current = point;
    drawingRef.current = true;
    setEraserPosition(point);
    if (toolRef.current === 'erase') {
      activeStrokeRef.current = null;
      eraseAt(point);
    } else {
      activeStrokeRef.current = [point];
    }
    setIsDrawing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    pointerRef.current = point;
    setEraserPosition(point);
    if (!drawingRef.current) return;
    if (toolRef.current === 'erase') {
      eraseAt(point);
      event.preventDefault();
      return;
    }
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current.push(point);
    event.preventDefault();
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (activeStrokeRef.current && activeStrokeRef.current.length > 1) {
      strokesRef.current = [...strokesRef.current, activeStrokeRef.current].slice(-MAX_STROKES);
      setHasMarks(true);
    }
    activeStrokeRef.current = null;
    setIsDrawing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const eraseAt = (point: Point) => {
    const radius = 0.07;
    strokesRef.current = strokesRef.current
      .map((stroke) => stroke.filter((mark) => Math.hypot(mark.x - point.x, mark.y - point.y) > radius))
      .filter((stroke) => stroke.length > 1);
    setHasMarks(strokesRef.current.length > 0);
  };

  const clearDrawing = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setHasMarks(false);
  };

  return (
    <main className="scribe-not-found" data-drawing={isDrawing ? 'true' : 'false'} data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
      <div className="scribe-not-found__noise" aria-hidden="true" />
      <header className="scribe-not-found__header">
        <Link href="/" className="scribe-not-found__brand" aria-label="Return to ScribeBoard home">
          <span className="scribe-not-found__brand-mark"><Sparkles size={16} aria-hidden="true" /></span>
          Scribe<span>Board</span>
        </Link>
        <span className="scribe-not-found__status"><i /> Route monitor / 404</span>
      </header>

      <div className="scribe-not-found__layout">
        <section className="scribe-not-found__copy" aria-labelledby="not-found-title">
          <p className="scribe-not-found__eyebrow"><span /> Lost in the workspace</p>
          <p className="scribe-not-found__code"><strong>404</strong><span>— PAGE NOT FOUND</span></p>
          <h1 id="not-found-title">This route<br /><em>wandered off.</em></h1>
          <p className="scribe-not-found__description">The page you were looking for is not in this system. Draw a new direction, or return to a place that still exists.</p>
          <div className="scribe-not-found__actions"><Link href="/" className="scribe-not-found__primary"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link><Link href="/dashboard" className="scribe-not-found__secondary">Open workspace <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </section>

        <section className="scribe-not-found__board-wrap" aria-labelledby="not-found-canvas-title">
          <div className="scribe-not-found__board-label"><span id="not-found-canvas-title">Untitled route</span><span>canvas / unsaved</span></div>
          <div className="scribe-not-found__board-shell">
            <div className="scribe-not-found__toolbar"><span className="scribe-not-found__traffic" aria-hidden="true"><i /><i /><i /></span><span className="scribe-not-found__window-title">ScribeBoard / 404</span><span className="scribe-not-found__toolbar-meta"><i /> live canvas</span></div>
            <div className="scribe-not-found__canvas-region">
              <canvas ref={canvasRef} aria-label={tool === 'erase' ? 'Interactive canvas eraser. Drag to erase your marks.' : 'Interactive blank canvas. Draw a new route with your pointer.'} onPointerEnter={() => setIsOverCanvas(true)} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishStroke} onPointerCancel={finishStroke} onPointerLeave={(event) => { setIsOverCanvas(false); if (!drawingRef.current) pointerRef.current = getPoint(event); }} />
              <div className="scribe-not-found__duster" aria-hidden="true" style={{ left: `${eraserPosition.x * 100}%`, top: `${eraserPosition.y * 100}%`, opacity: tool === 'erase' && isOverCanvas ? 1 : 0 }}><span /><strong>FELT DUSTER</strong><i /><i /></div>
              <div className="scribe-not-found__canvas-note" aria-hidden="true"><span>try a new path</span><svg viewBox="0 0 40 42" fill="none"><path d="M5 5c18 3 26 14 17 29M18 29l4 7 8-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="scribe-not-found__empty-node" aria-hidden="true"><span /><strong>new route</strong><small>starts here</small></div>
            </div>
            <div className="scribe-not-found__board-footer"><span><i className={hasMarks ? 'is-active' : ''} /> {hasMarks ? 'draft captured' : 'waiting for a mark'}</span><span>pointer / draw / explore</span></div>
          </div>
          <div className="scribe-not-found__canvas-controls"><span className="scribe-not-found__hint">{tool === 'erase' ? <Eraser size={14} aria-hidden="true" /> : <MousePointer2 size={14} aria-hidden="true" />} {tool === 'erase' ? 'Drag the duster to erase' : 'Draw directly on the canvas'}</span><div className="scribe-not-found__tool-group" role="group" aria-label="Canvas tools"><button type="button" className={tool === 'draw' ? 'is-active' : ''} onClick={() => chooseTool('draw')} aria-pressed={tool === 'draw'}><MousePointer2 size={13} aria-hidden="true" /> Draw</button><button type="button" className={tool === 'erase' ? 'is-active' : ''} onClick={() => chooseTool('erase')} aria-pressed={tool === 'erase'}><Eraser size={13} aria-hidden="true" /> Duster</button><button type="button" onClick={clearDrawing} disabled={!hasMarks} aria-label="Clear the drawing"><RotateCcw size={13} aria-hidden="true" /> Clear</button></div></div>
        </section>
      </div>

      <footer className="scribe-not-found__footer"><span>signal lost, not the idea</span><span>© 2026 ScribeBoard</span></footer>
      <style>{`
        .scribe-not-found { --nf-paper: var(--landing-background, #faf9f6); --nf-ink: #111713; --nf-green: #0f764a; position: relative; isolation: isolate; display: flex; min-height: 100svh; flex-direction: column; overflow: hidden; background: var(--nf-paper); color: var(--nf-ink); font-family: var(--font-sans), sans-serif; }
        .scribe-not-found__noise { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .3; background-image: radial-gradient(rgb(15 118 74 / .08) .7px, transparent .7px); background-size: 18px 18px; mask-image: linear-gradient(to bottom, black, transparent 86%); }
        .scribe-not-found__header { display: flex; align-items: center; justify-content: space-between; width: min(100% - 48px, 1400px); margin-inline: auto; padding: 28px 0; }
        .scribe-not-found__brand { display: inline-flex; align-items: center; gap: 9px; color: var(--nf-ink); font-size: 15px; font-weight: 800; letter-spacing: -.04em; text-decoration: none; }
        .scribe-not-found__brand > span:last-child { color: var(--nf-green); }
        .scribe-not-found__brand-mark { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid rgb(167 243 208 / .8); border-radius: 9px; background: #ecfdf5; color: var(--nf-green); }
        .scribe-not-found__status { display: inline-flex; align-items: center; gap: 8px; color: #7a817b; font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
        .scribe-not-found__status i, .scribe-not-found__toolbar-meta i { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
        .scribe-not-found__layout { display: grid; width: min(100% - 48px, 1400px); flex: 1; grid-template-columns: minmax(280px, .78fr) minmax(520px, 1.22fr); align-items: center; gap: clamp(36px, 8vw, 128px); margin-inline: auto; padding: 22px 0 58px; }
        .scribe-not-found__copy { max-width: 500px; }
        .scribe-not-found__eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 22px; color: #6e7971; font-size: 10px; font-weight: 800; letter-spacing: .17em; text-transform: uppercase; }
        .scribe-not-found__eyebrow > span { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
        .scribe-not-found__code { display: flex; align-items: baseline; gap: 12px; margin: 0 0 18px; color: #728079; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
        .scribe-not-found__code strong { color: var(--nf-green); font-size: clamp(24px, 3vw, 38px); font-weight: 900; letter-spacing: -.08em; line-height: 1; }
        .scribe-not-found__code span { color: #8f9a92; }
        .scribe-not-found h1 { margin: 0; color: #080b09; font-size: clamp(58px, 7.2vw, 104px); font-weight: 900; letter-spacing: -.085em; line-height: .89; }
        .scribe-not-found h1 em { display: block; margin-top: 10px; color: var(--nf-green); font-family: var(--font-display), Georgia, serif; font-size: 1.02em; font-style: italic; font-weight: 400; letter-spacing: -.045em; }
        .scribe-not-found__description { max-width: 390px; margin: 28px 0 30px; color: #626d65; font-size: 14px; line-height: 1.7; }
        .scribe-not-found__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
        .scribe-not-found__primary, .scribe-not-found__secondary { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; gap: 9px; border-radius: 999px; padding: 0 18px; font-size: 12px; font-weight: 750; text-decoration: none; transition: transform 180ms ease, background-color 180ms ease; }
        .scribe-not-found__primary { background: var(--nf-ink); color: white; box-shadow: 0 12px 26px -10px rgb(15 118 74 / .35); }
        .scribe-not-found__primary:hover { background: var(--nf-green); transform: translateY(-2px); }
        .scribe-not-found__secondary { border: 1px solid #dfe5e0; color: #47514a; }
        .scribe-not-found__secondary:hover { background: white; transform: translateY(-2px); }
        .scribe-not-found__board-wrap { min-width: 0; }
        .scribe-not-found__board-label, .scribe-not-found__canvas-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #849089; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
        .scribe-not-found__board-label { margin-bottom: 10px; padding-inline: 4px; }
        .scribe-not-found__board-label span:first-child { color: var(--nf-ink); font-weight: 700; }
        .scribe-not-found__board-shell { overflow: hidden; border: 1px solid #dfe6e1; border-radius: 18px; background: white; box-shadow: 0 28px 60px -24px rgb(15 24 18 / .2), 0 0 0 1px rgb(255 255 255 / .8) inset; }
        .scribe-not-found__toolbar { position: relative; display: flex; min-height: 46px; align-items: center; justify-content: space-between; border-bottom: 1px solid #edf1ee; padding: 0 18px; background: white; }
        .scribe-not-found__traffic { display: flex; gap: 6px; }
        .scribe-not-found__traffic i { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 1px rgb(17 24 39 / .08) inset; }
        .scribe-not-found__traffic i:nth-child(1) { background: #ff5f57; }.scribe-not-found__traffic i:nth-child(2) { background: #febc2e; }.scribe-not-found__traffic i:nth-child(3) { background: #28c840; }
        .scribe-not-found__window-title { position: absolute; left: 50%; color: #737a75; font-size: 10px; font-weight: 700; transform: translateX(-50%); }
        .scribe-not-found__toolbar-meta { display: inline-flex; align-items: center; gap: 6px; color: #5b7767; font-size: 9px; }
        .scribe-not-found__canvas-region { position: relative; height: clamp(320px, 38vw, 520px); overflow: hidden; background: #fff; }
        .scribe-not-found__canvas-region canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
        .scribe-not-found__duster { position: absolute; z-index: 4; display: flex; width: 94px; height: 34px; align-items: center; justify-content: space-between; border: 1.5px solid #111713; border-radius: 5px; padding: 0 7px; background: linear-gradient(180deg, #f5f1e7 0%, #ddd4c5 54%, #aa9e8f 100%); box-shadow: 2px 6px 8px rgb(20 20 20 / .28); pointer-events: none; transform: translate(-50%, -50%) rotate(-8deg); transition: opacity 100ms ease; }
        .scribe-not-found__duster::before { position: absolute; top: -7px; left: -1px; right: -1px; height: 8px; border: 1px solid #111713; border-radius: 4px 4px 0 0; background: linear-gradient(90deg, #2b2b2b, #111713, #090909); content: ''; }
        .scribe-not-found__duster strong { color: #59615b; font-family: ui-monospace, monospace; font-size: 6px; letter-spacing: .08em; }
        .scribe-not-found__duster i { width: 4px; height: 4px; border-radius: 50%; background: #59615b; }
        .scribe-not-found__canvas-note { position: absolute; top: 16%; right: 9%; display: flex; align-items: center; flex-direction: column; color: #63816f; font-family: var(--font-display), Georgia, serif; font-size: 16px; font-style: italic; line-height: .95; pointer-events: none; transform: rotate(4deg); }
        .scribe-not-found__canvas-note svg { width: 34px; height: 38px; margin-top: 6px; }
        .scribe-not-found__empty-node { position: absolute; top: 43%; left: 50%; display: flex; align-items: center; gap: 9px; border: 1px solid #dbe7df; border-radius: 12px; padding: 9px 13px; background: rgb(255 255 255 / .82); box-shadow: 0 10px 20px -9px rgb(15 118 74 / .2); pointer-events: none; transform: translate(-50%, -50%) rotate(-3deg); }
        .scribe-not-found__empty-node > span { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }.scribe-not-found__empty-node strong { color: #2d4938; font-size: 11px; }.scribe-not-found__empty-node small { color: #829087; font-family: ui-monospace, monospace; font-size: 8px; }
        .scribe-not-found__board-footer { display: flex; min-height: 46px; align-items: center; justify-content: space-between; border-top: 1px solid #edf1ee; padding: 0 18px; color: #8a938c; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
        .scribe-not-found__board-footer span:first-child { display: inline-flex; align-items: center; gap: 7px; }.scribe-not-found__board-footer i { width: 6px; height: 6px; border-radius: 50%; background: #c5d0c8; }.scribe-not-found__board-footer i.is-active { background: #10b981; }
        .scribe-not-found__canvas-controls { margin-top: 12px; padding-inline: 4px; text-transform: none; letter-spacing: 0; }.scribe-not-found__hint { display: inline-flex; align-items: center; gap: 6px; color: #5e7567; }.scribe-not-found__tool-group { display: inline-flex; align-items: center; gap: 10px; }
        .scribe-not-found__canvas-controls button { display: inline-flex; align-items: center; gap: 6px; border: 0; border-bottom: 1px solid #cdd8d0; padding: 0 0 3px; background: transparent; color: #637269; cursor: pointer; font-family: inherit; font-size: inherit; }.scribe-not-found__canvas-controls button:hover, .scribe-not-found__canvas-controls button.is-active { color: var(--nf-green); border-color: var(--nf-green); }.scribe-not-found__canvas-controls button:disabled { cursor: not-allowed; opacity: .35; }
        .scribe-not-found__footer { display: flex; width: min(100% - 48px, 1400px); margin-inline: auto; justify-content: space-between; border-top: 1px solid #e1e8e2; padding: 16px 0 22px; color: #9aa49c; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }.scribe-not-found__footer span:first-child { color: var(--nf-green); }
        @media (max-width: 900px) { .scribe-not-found__layout { grid-template-columns: 1fr; padding-top: 24px; }.scribe-not-found__copy { max-width: 620px; }.scribe-not-found__board-wrap { max-width: 700px; }.scribe-not-found__canvas-region { height: 400px; } }
        @media (max-width: 560px) { .scribe-not-found__header, .scribe-not-found__layout, .scribe-not-found__footer { width: min(100% - 30px, 480px); }.scribe-not-found__header { padding-block: 20px; }.scribe-not-found__status { font-size: 8px; }.scribe-not-found h1 { font-size: clamp(50px, 15vw, 72px); }.scribe-not-found__canvas-region { height: 360px; }.scribe-not-found__board-footer span:last-child, .scribe-not-found__eraser { display: none; }.scribe-not-found__canvas-controls { font-size: 8px; }.scribe-not-found__footer { flex-wrap: wrap; gap: 8px; } }
        @media (prefers-reduced-motion: reduce) { .scribe-not-found *, .scribe-not-found *::before, .scribe-not-found *::after { animation: none !important; transition: none !important; } }
      `}</style>
    </main>
  );
}
