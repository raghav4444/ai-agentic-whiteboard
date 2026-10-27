 'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Volume2, VolumeX } from '@/lib/icons';

type LandingNavProps = {
  active?: 'home' | 'how-it-works' | 'capabilities';
  showSound?: boolean;
};

export function LandingNav({ active = 'home', showSound = false }: LandingNavProps) {
  const [soundOn, setSoundOn] = useState(true);

  const toggleSound = () => {
    setSoundOn((current) => {
      const next = !current;
      if (next && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 520;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.2);
          oscillator.addEventListener('ended', () => void context.close(), { once: true });
        }
      }
      return next;
    });
  };

  return (
    <nav className="landing-nav" aria-label="Primary navigation">
      <Link href="/" className="brand-mark" aria-label="ScribeBoard home">
        <Image src="/logo.svg" alt="" width={28} height={28} />
        <span>Scribe<span>Board</span></span>
      </Link>
      <div className="nav-links">
        <Link href="/capabilities" aria-current={active === 'capabilities' ? 'page' : undefined}>Capabilities</Link>
        <Link
          href="/how-it-works"
          aria-current={active === 'how-it-works' ? 'page' : undefined}
        >
          How it works
        </Link>
        <Link href="/#about">About</Link>
      </div>
      <div className="nav-actions">
        {showSound && (
          <button type="button" className="nav-sound" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Mute interface sounds' : 'Enable interface sounds'}>
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>Sound</span>
          </button>
        )}
        <Link href="/sign-in" className="nav-login">Sign in</Link>
        <Link href="/dashboard" className="button button-dark button-small">
          Open workspace <ArrowUpRight size={14} />
        </Link>
      </div>
    </nav>
  );
}

export default LandingNav;
