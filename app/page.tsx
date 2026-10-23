'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Check,
} from '@/lib/icons';
import { WhiteboardHero } from '@/components/custom/workspace/WhiteboardHero';
import LandingNav from '@/components/custom/landing/LandingNav';
import { WorkflowShowcase } from '@/components/custom/landing/WorkflowShowcase';
import { FinalCtaSection } from '@/components/custom/landing/FinalCtaSection';
import { ClosingSystemSection } from '@/components/custom/landing/ClosingSystemSection';
import { TestimonialsShowcase } from '@/components/custom/landing/TestimonialsShowcase';

export default function Home() {

  return (
    <main className="landing-page min-h-screen overflow-x-clip">
      <LandingNav />

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> AI-assisted systems thinking</p>
          <h1>Make the complex<br /><em>visible.</em></h1>
          <p className="hero-description">ScribeBoard is an infinite canvas for turning ambitious technical ideas into clear, collaborative diagrams.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button button-dark">Start creating <ArrowRight size={16} /></Link>
            <a href="#workflow-showcase" className="text-link">See what you can build <ArrowRight size={15} /></a>
          </div>
          <div className="hero-note"><Check size={14} /> No credit card required</div>
        </div>
        <div className="hero-visual" aria-label="A generated architecture diagram on a hanging whiteboard">
            <WhiteboardHero />
        </div>
      </section>


      <section className="proof-strip" id="about">
        <span>For engineers, designers, and teams who think in systems.</span>
        <div className="proof-items"><span>Architecture</span><span>Flows</span><span>Wireframes</span><span>Documentation</span></div>
      </section>

      <WorkflowShowcase />

      <ClosingSystemSection />

      <TestimonialsShowcase />

      <FinalCtaSection />

      <footer className="landing-footer"><Link href="/" className="brand-mark"><Image src="/logo.svg" alt="" width={24} height={24} /><span>Scribe<span>Board</span></span></Link><span>Built for thinking out loud.</span><span>© 2026 ScribeBoard</span></footer>
    </main>
  );
}
