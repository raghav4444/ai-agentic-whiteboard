'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Code,
  Box,
  Download,
  FileText,
  GitBranch,
  Globe,
  ImageIcon,
  MousePointer2,
  Network,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share,
  Sparkles,
  Square,
  Type,
  X,
} from '@/lib/icons';

type StageId = 'hero' | 'step01' | 'step02' | 'step03' | 'step04' | 'step05';

const STAGES: Array<{ id: StageId; number: string; label: string }> = [
  { id: 'hero', number: '', label: 'Top' },
  { id: 'step01', number: '01', label: 'Input' },
  { id: 'step02', number: '02', label: 'Structure' },
  { id: 'step03', number: '03', label: 'Canvas' },
  { id: 'step04', number: '04', label: 'Guidance' },
  { id: 'step05', number: '05', label: 'Result' },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

let audioContext: AudioContext | null = null;

function playTone(frequency: number, duration = 0.14) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ??= new AudioContextClass();
    const context = audioContext;
    if (context.state === 'suspended') void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, context.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  } catch {
    // Audio is decorative. Browsers may reject it until the first gesture.
  }
}

function MacDots() {
  return <span className="sb-how-mac-dots" aria-hidden="true"><i /><i /><i /></span>;
}

function WindowChrome({
  children,
  result = false,
  onExport,
}: {
  children: React.ReactNode;
  result?: boolean;
  onExport?: () => void;
}) {
  return (
    <div className="sb-how-window">
      <div className="sb-how-window-bar">
        <div className="sb-how-window-title"><MacDots /><span>● AI Whiteboard</span></div>
        {result ? (
          <div className="sb-how-window-actions">
            <button type="button" className="sb-how-blue-button"><Save size={12} /> Save</button>
            <button type="button" className="sb-how-light-button"><Share size={12} /> Share</button>
            <button type="button" className="sb-how-light-button sb-how-export-button" onClick={onExport}><Download size={12} /> Export</button>
          </div>
        ) : (
          <div className="sb-how-window-tabs"><span>Whiteboard</span><span>Doc</span></div>
        )}
      </div>
      {children}
    </div>
  );
}

function CanvasGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`sb-how-canvas-grid ${className}`}>{children}</div>;
}

function PromptBar({ onGenerate, compact = false }: { onGenerate?: () => void; compact?: boolean }) {
  const prompts = [
    'Build an AI-powered SaaS architecture',
    'Design an onboarding user flow with OAuth',
    'PostgreSQL schema with users, orders, and payments',
    'RAG vector pipeline with LangChain and Pinecone',
  ];
  const [prompt, setPrompt] = useState(prompts[0]);
  const [typing, setTyping] = useState(false);
  const manualTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (manualTimerRef.current) window.clearInterval(manualTimerRef.current);
  }, []);

  const choosePrompt = (value: string) => {
    if (manualTimerRef.current) window.clearInterval(manualTimerRef.current);
    setTyping(true);
    setPrompt('');
    let index = 0;
    manualTimerRef.current = window.setInterval(() => {
      setPrompt(value.slice(0, index + 1));
      index += 1;
      if (index >= value.length) {
        if (manualTimerRef.current) window.clearInterval(manualTimerRef.current);
        setTyping(false);
      }
    }, 18);
  };

  return (
    <div className={`sb-how-prompt-bar ${compact ? 'is-compact' : ''}`}>
      <Sparkles size={compact ? 15 : 18} className="sb-how-prompt-spark" />
      <span className="sb-how-prompt-text">{prompt}</span>
      <span className={`sb-how-prompt-caret ${typing ? 'is-typing' : ''}`} aria-hidden="true" />
      <button type="button" className="sb-how-generate" onClick={() => { playTone(720); onGenerate?.(); }}><Plus size={13} /> Generate</button>
      {!compact && <div className="sb-how-prompt-tags" aria-label="Prompt examples">
        {prompts.map((value) => <button type="button" key={value} onClick={() => choosePrompt(value)}>{value.split(' ').slice(0, 2).join(' ')}</button>)}
      </div>}
    </div>
  );
}

function ToolPalette() {
  return (
    <div className="sb-how-tool-palette" aria-label="Canvas tools">
      <button type="button" className="is-active" aria-label="Select"><MousePointer2 size={15} /></button>
      <button type="button" aria-label="Rectangle"><Square size={15} /></button>
      <button type="button" aria-label="Text"><Type size={15} /></button>
      <button type="button" aria-label="Connector"><GitBranch size={15} /></button>
      <button type="button" aria-label="Add"><Plus size={15} /></button>
    </div>
  );
}

function NodeCard({
  kind,
  title,
  icon: Icon,
  className = '',
  pulse = false,
}: {
  kind: 'blue' | 'green' | 'purple' | 'amber' | 'neutral';
  title: string;
  icon: typeof Globe;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <div className={`sb-how-node-card node-${kind} ${className} ${pulse ? 'is-pulsing' : ''}`}>
      <div className="sb-how-node-icon"><Icon size={19} /></div>
      <span>{title}</span>
    </div>
  );
}

function Connector({ bidirectional = false }: { bidirectional?: boolean }) {
  return <div className={`sb-how-connector ${bidirectional ? 'is-bidirectional' : ''}`}><i /><i /></div>;
}

function ArchitectureDiagram({ result = false, compact = false, auth = false }: { result?: boolean; compact?: boolean; auth?: boolean }) {
  return (
    <div className={`sb-how-architecture ${compact ? 'is-compact' : ''} ${result ? 'is-result' : ''}`}>
      <NodeCard kind="blue" title="Web App" icon={Globe} />
      <Connector />
      {auth && <><NodeCard kind="purple" title="Auth Service" icon={Network} className="sb-how-auth-node" pulse /><Connector /></>}
      <NodeCard kind="green" title="API" icon={Network} />
      <Connector bidirectional />
      <NodeCard kind="purple" title="AI Service" icon={Sparkles} />
      <div className="sb-how-db-branch" aria-hidden="true" />
      <NodeCard kind="amber" title="Database" icon={Box} className="sb-how-db-node" />
    </div>
  );
}

function HeroCanvas() {
  return (
    <div className="sb-how-hero-window-wrap">
      <div className="sb-how-hand-note sb-how-hero-note">Describe.<br />Generate.<br />Refine.<br />Collaborate.</div>
      <WindowChrome>
        <CanvasGrid className="sb-how-hero-grid">
          <ToolPalette />
          <PromptBar compact />
          <ArchitectureDiagram />
          <div className="sb-how-ai-helper-chip"><Sparkles size={15} /><span>AI Helper</span><ArrowUpRight size={14} /></div>
        </CanvasGrid>
      </WindowChrome>
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return <div className="sb-how-checklist">{items.map((item) => <div key={item}><Check size={15} /><span>{item}</span></div>)}</div>;
}

function StageHeading({ number, label, children }: { number: string; label: string; children: React.ReactNode }) {
  return <><div className="sb-how-stage-kicker"><strong>{number}</strong><span>{label}</span></div><h2>{children}</h2></>;
}

function StepOne({ onGenerate }: { onGenerate: () => void }) {
  return (
    <section id="step01" className="sb-how-reference-section sb-how-step-one">
      <div className="sb-how-step-copy"><StageHeading number="01" label="THE INPUT">Describe<br /><em>your idea.</em></StageHeading><p>Tell the AI what you want to visualize — a system architecture, a user flow, a workflow, or any technical concept.</p><div className="sb-how-topic-tags"><button type="button">System architecture</button><button type="button">User flow</button><button type="button">Database schema</button><button type="button">AI workflow</button></div></div>
      <div className="sb-how-step-prompt"><div className="sb-how-hand-note">Just describe<br />your idea<br />in plain text. <ArrowUpRight size={25} /></div><div className="sb-how-prompt-card"><PromptBar onGenerate={onGenerate} /></div></div>
    </section>
  );
}

function StepTwo({ onReplay }: { onReplay: () => void }) {
  return (
    <section id="step02" className="sb-how-reference-section sb-how-step-two">
      <div className="sb-how-step-canvas"><div className="sb-how-hand-note sb-how-left-note">From prompt<br />to structure<br />in seconds. <ArrowUpRight size={21} /></div><WindowChrome><CanvasGrid className="sb-how-structure-grid"><div className="sb-how-structure-toolbar"><MacDots /><span>● AI Whiteboard</span><button type="button" onClick={onReplay} aria-label="Replay diagram generation"><span>100%</span><RotateCcw size={14} /></button></div><ArchitectureDiagram compact /></CanvasGrid></WindowChrome></div>
      <div className="sb-how-step-copy"><StageHeading number="02" label="THE TRANSFORMATION">Watch the<br /><em>structure appear.</em></StageHeading><p>The AI turns your idea into a clear, visual diagram with relevant components and connections.</p><CheckList items={['Understands your request', 'Identifies key components', 'Creates structured diagrams', 'Saves you hours of manual work']} /></div>
    </section>
  );
}

function DraggableNote({ className, children }: { className: string; children: React.ReactNode }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  return <div className={`sb-how-sticky-note ${className}`} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }} onPointerDown={(event) => { dragging.current = true; start.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }; event.currentTarget.setPointerCapture(event.pointerId); playTone(310, 0.07); }} onPointerMove={(event) => { if (dragging.current) setOffset({ x: (event.clientX - start.current.x) * 0.4, y: (event.clientY - start.current.y) * 0.4 }); }} onPointerUp={(event) => { dragging.current = false; event.currentTarget.releasePointerCapture(event.pointerId); setOffset({ x: 0, y: 0 }); playTone(240, 0.07); }}>{children}</div>;
}

function StepThree() {
  return (
    <section id="step03" className="sb-how-reference-section sb-how-step-three">
      <div className="sb-how-step-copy"><StageHeading number="03" label="THE CANVAS">Make it <em>your own.</em></StageHeading><p>Your diagram is fully editable. Move elements, add text, shapes, images, and connectors to make it yours.</p><CheckList items={['Drag, drop, and organize', 'Shapes, text, and annotations', 'Images and screenshots', 'Flexible and infinite canvas']} /></div>
      <div className="sb-how-editable-wrap"><div className="sb-how-hand-note sb-how-edit-note">Make it yours. <ArrowUpRight size={22} /></div><div className="sb-how-editable-board"><div className="sb-how-editable-tools"><span className="shape-rect" />Rectangle<span className="shape-circle" />Circle<span className="shape-diamond" />Diamond<ArrowUpRight size={14} />Arrow<Type size={14} />Text<ImageIcon size={14} />Image</div><div className="sb-how-editable-surface"><DraggableNote className="note-pink">Drag.<br />Drop.<br />Create.</DraggableNote><DraggableNote className="note-purple">Fully<br />Editable</DraggableNote><div className="sb-how-hand-note sb-how-bottom-note">Visualize anything.<br /><em>Your canvas, your rules.</em></div><div className="sb-how-pipeline"><NodeCard kind="blue" title="Frontend" icon={Code} /><Connector /><NodeCard kind="green" title="API" icon={Network} /><Connector /><NodeCard kind="amber" title="Database" icon={Box} /></div></div><div className="sb-how-icon-dock"><strong>Emoji and Icons</strong><div><Globe size={15} /><Network size={15} /><Sparkles size={15} /><Box size={15} /><Circle size={15} /><Square size={15} /></div><span><Search size={12} />Search icons...</span></div></div></div>
    </section>
  );
}

function StepFour({ onAuth }: { onAuth: () => void }) {
  const [message, setMessage] = useState('');
  const [applied, setApplied] = useState('');
  const actions = ['Add authentication service', 'Improve architecture', 'Suggest scalability', 'Add monitoring', 'Generate documentation'];
  return (
    <section id="step04" className="sb-how-reference-section sb-how-step-four">
      <div className="sb-how-helper-panel-wrap"><div className="sb-how-hand-note sb-how-left-note">Refine.<br />Improve.<br />Iterate<br />with AI. <ArrowUpRight size={22} /></div><div className="sb-how-helper-panel"><div className="sb-how-helper-heading"><div><span><Sparkles size={16} /></span><div><strong>AI Helper</strong><small>Turn your ideas into visual content</small></div></div><button type="button" aria-label="Close helper"><X size={15} /></button></div><div className="sb-how-helper-actions">{actions.map((action, index) => <button type="button" key={action} className={applied === action ? 'is-applied' : ''} onClick={() => { setApplied(action); playTone(780 + index * 35); if (index === 0) onAuth(); }}><span><Sparkles size={14} /><b>{action}</b></span><small>Apply +</small></button>)}</div><div className="sb-how-helper-input"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask anything..." onKeyDown={(event) => { if (event.key === 'Enter' && message.trim()) { setApplied('Architecture updated'); setMessage(''); playTone(820); } }} /><button type="button" aria-label="Send prompt" onClick={() => { if (message.trim()) { setApplied('Architecture updated'); setMessage(''); playTone(820); } }}><ArrowUpRight size={15} /></button></div>{applied && <div className="sb-how-helper-status">✓ {applied}</div>}</div></div>
      <div className="sb-how-step-copy"><StageHeading number="04" label="THE ASSISTANT">Get AI guidance<br /><em>at every step.</em></StageHeading><p>Use the AI Helper to refine your diagram, add new elements, improve structure, or explore the next steps in your project.</p><CheckList items={['Add or modify elements', 'Improve architecture', 'Get suggestions and best practices', 'Generate documentation']} /></div>
    </section>
  );
}

function StepFive({ auth }: { auth: boolean }) {
  const [exportOpen, setExportOpen] = useState(true);
  return (
    <section id="step05" className="sb-how-reference-section sb-how-step-five">
      <div className="sb-how-step-copy"><StageHeading number="05" label="THE RESULT">Save, share,<br /><em>and take it further.</em></StageHeading><p>Bring your diagram together, export it, and collaborate with your team. Your ideas are ready to present, share, or keep building on.</p><CheckList items={['Save to workspace', 'Export as PNG, PDF, SVG', 'Share with a link', 'Integrate with your favorite tools']} /></div>
      <div className="sb-how-result-wrap"><div className="sb-how-hand-note sb-how-result-note">Ready to<br />share and<br />build on. <ArrowUpRight size={22} /></div><WindowChrome result onExport={() => setExportOpen((open) => !open)}><CanvasGrid className="sb-how-result-grid">{exportOpen && <div className="sb-how-export-menu"><button type="button"><ImageIcon size={14} /> Export as PNG</button><button type="button"><FileText size={14} /> Export as PDF</button><button type="button"><Code size={14} /> Export as SVG</button></div>}<ArchitectureDiagram result auth={auth} /><div className="sb-how-result-footer"><DraggableNote className="note-yellow">Scalable AI SaaS Architecture</DraggableNote><div><span>SYNC:</span><b>N</b><b>F</b><b>#</b><strong>More...</strong></div></div></CanvasGrid></WindowChrome></div>
    </section>
  );
}

function Scrubber({ active }: { active: StageId }) {
  return <div className="sb-how-scrubber">{STAGES.map((stage) => <a href={`#${stage.id}`} key={stage.id} className={active === stage.id ? 'is-active' : ''}><span>{stage.number}</span>{stage.label}</a>)}</div>;
}

export function HowItWorksJourney() {
  const rootRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Record<StageId, HTMLElement | null>>({ hero: null, step01: null, step02: null, step03: null, step04: null, step05: null });
  const pathRef = useRef<SVGPathElement>(null);
  const [active, setActive] = useState<StageId>('hero');
  const [auth, setAuth] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [spline, setSpline] = useState({ d: '', width: 1, height: 1 });
  const reduced = useReducedMotion();
  const photonRef = useRef<SVGCircleElement>(null);
  const splineLengthRef = useRef(0);
  const splineCurrentRef = useRef(0);
  const splineTargetRef = useRef(0);
  const splineFrameRef = useRef(0);
  const activeStageRef = useRef<StageId>('hero');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    const draw = () => {
      splineFrameRef.current = 0;
      const path = pathRef.current;
      const length = splineLengthRef.current;
      if (disposed || !path || !length) return;
      const target = splineTargetRef.current;
      const current = reduced ? target : splineCurrentRef.current + (target - splineCurrentRef.current) * 0.16;
      splineCurrentRef.current = current;
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${Math.max(0, length - current)}`;
      const photon = photonRef.current;
      if (photon) {
        const point = path.getPointAtLength(Math.min(current, length));
        photon.setAttribute('cx', String(point.x));
        photon.setAttribute('cy', String(point.y));
        photon.setAttribute('opacity', current > 1 ? '1' : '0');
      }
      if (!reduced && Math.abs(target - current) > 0.2) splineFrameRef.current = window.requestAnimationFrame(draw);
    };
    const update = () => {
      if (disposed) return;
      const path = pathRef.current;
      const length = splineLengthRef.current;
      if (!path || !length) return;
      const rect = root.getBoundingClientRect();
      const focusY = window.innerHeight * 0.58 - rect.top;
      let low = 0;
      let high = length;
      for (let i = 0; i < 18; i += 1) {
        const middle = (low + high) / 2;
        if (path.getPointAtLength(middle).y < focusY) low = middle;
        else high = middle;
      }
      splineTargetRef.current = (low + high) / 2;
      const marker = window.scrollY + window.innerHeight * 0.38;
      const current = STAGES.reduce<StageId>((found, stage) => {
        const element = sectionRefs.current[stage.id];
        if (element && marker >= element.offsetTop) return stage.id;
        return found;
      }, 'hero');
      if (current !== activeStageRef.current) {
        activeStageRef.current = current;
        setActive(current);
      }
      if (!splineFrameRef.current) splineFrameRef.current = window.requestAnimationFrame(draw);
    };
    const rebuild = () => {
      if (disposed) return;
      const rect = root.getBoundingClientRect();
      const width = Math.max(root.scrollWidth, window.innerWidth);
      const height = root.scrollHeight;
      const points = STAGES.map((stage, index) => {
        const element = sectionRefs.current[stage.id];
        if (!element) return { x: width / 2, y: 0 };
        const section = element.getBoundingClientRect();
        const x = index === 0 ? width * 0.52 : width * ([0.44, 0.56, 0.42, 0.56, 0.48][index - 1] ?? 0.5);
        return { x, y: section.top - rect.top + section.height * 0.5 };
      });
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const mid = (current.y + next.y) / 2;
        d += ` C ${current.x} ${mid}, ${next.x} ${mid}, ${next.x} ${next.y}`;
      }
      pathRef.current?.setAttribute('d', d);
      splineLengthRef.current = pathRef.current?.getTotalLength() || 0;
      splineCurrentRef.current = Math.min(splineCurrentRef.current, splineLengthRef.current);
      setSpline({ d, width, height });
      update();
    };
    const requestScrollUpdate = () => update();
    const resize = new ResizeObserver(rebuild);
    resize.observe(root);
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', rebuild);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', update);
    document.fonts.ready.then(() => { if (!disposed) rebuild(); });
    rebuild();
    return () => { disposed = true; resize.disconnect(); media.removeEventListener('change', update); window.removeEventListener('scroll', requestScrollUpdate); window.removeEventListener('resize', rebuild); window.cancelAnimationFrame(splineFrameRef.current); };
  }, [reduced]);

  const setSectionRef = (id: StageId) => (element: HTMLElement | null) => { sectionRefs.current[id] = element; };
  const scrollToStepTwo = () => document.getElementById('step02')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });

  return (
    <main ref={rootRef} className="sb-how-page" aria-labelledby="sb-how-title">
      <div className="sb-how-ambient" aria-hidden="true"><span /><span /><span /></div>
      <svg className="sb-how-spline" width={spline.width} height={spline.height} viewBox={`0 0 ${spline.width} ${spline.height}`} aria-hidden="true"><defs><linearGradient id="sbHowSplineGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset=".35" stopColor="#06b6d4" /><stop offset=".65" stopColor="#10b981" /><stop offset="1" stopColor="#2563eb" /></linearGradient><filter id="sbHowLaserGlow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><path d={spline.d} className="sb-how-spline-guide" /><path ref={pathRef} d={spline.d} className="sb-how-spline-active" /><circle ref={photonRef} className="sb-how-spline-photon" cx="0" cy="0" r="5" opacity="0"><animate attributeName="r" values="4.5;6.5;4.5" dur="1.45s" repeatCount="indefinite" /></circle></svg>
      <Scrubber active={active} />

      <section id="hero" ref={setSectionRef('hero')} className="sb-how-reference-hero">
        <div className="sb-how-hero-copy"><div className="sb-how-pill"><span />HOW IT WORKS</div><h1 id="sb-how-title">From a thought<br />to a complete<br /><em>diagram.</em></h1><p>Turn your ideas into clear visuals with AI. In just a few steps, go from a simple prompt to a fully editable, shareable, and collaborative diagram.</p><div className="sb-how-hero-buttons"><a href="#step01" className="sb-how-primary-cta">See it in action <ArrowRight size={16} /></a><a href="#step03" className="sb-how-secondary-cta"><Play size={15} fill="currentColor" /> Explore workspace</a></div><div className="sb-how-proof"><div><i /><i /><i /><i /></div><span>Used by builders, designers and teams</span></div></div><HeroCanvas /></section>

      <div ref={setSectionRef('step01')}><StepOne onGenerate={scrollToStepTwo} /></div>
      <div ref={setSectionRef('step02')} key={replayKey}><StepTwo onReplay={() => { setReplayKey((key) => key + 1); playTone(650); }} /></div>
      <div ref={setSectionRef('step03')}><StepThree /></div>
      <div ref={setSectionRef('step04')}><StepFour onAuth={() => { setAuth(true); window.setTimeout(() => document.getElementById('step05')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250); }} /></div>
      <div ref={setSectionRef('step05')}><StepFive auth={auth} /></div>

      <footer className="sb-how-reference-footer"><div><strong>ScribeBoard</strong><span>© 2026. Built for thinking out loud.</span></div><nav><a href="#hero">Back to top ↑</a><a href="#hero">Privacy</a><a href="#hero">Terms</a><a href="#hero">Status</a></nav></footer>
    </main>
  );
}

export default HowItWorksJourney;
