import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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

      {/* More sections coming... */}
    </div>
  );
}
