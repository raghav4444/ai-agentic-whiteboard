import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="ScribeBoard" width={34} height={34} />
            <span className="font-bold text-lg tracking-tight text-white">
              Scribe<span className="text-indigo-400">Board</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#ai-engine" className="hover:text-white transition-colors">AI Engine</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hover:bg-slate-800/60">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-md shadow-indigo-500/20">
                Launch Workspace <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-20 pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/50 text-indigo-300 text-xs font-medium mb-8 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>Powered by Groq Llama 3.3 & Excalidraw Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] text-slate-100">
            Turn Technical Ideas Into <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              Interactive Whiteboard Diagrams
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The collaborative infinite canvas built for engineers and software architects. Generate microservices architectures, flowcharts, and system designs in seconds using agentic AI.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/25 gap-2">
                Start Creating Free <ChevronRight size={16} />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-sm h-12 px-7 rounded-xl">
                Explore Capabilities
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
