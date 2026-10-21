'use client';

/**
 * ClosingHub — the closing block of the capabilities page.
 *
 * A summary of the product: the ScribeBoard hub sits at the centre with the
 * four things it does — Ideas, Diagrams, Workflows, Collaboration — arranged
 * around it and tied to it by curved connectors, with collaborators present on
 * the board and a couple of hand-written notes in the margins.
 *
 * The hub is drawn in a fixed 520x400 coordinate space so the HTML cards and
 * the SVG connectors agree with each other; the container keeps that aspect
 * ratio, which also means the connector strokes never distort.
 */

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  ArrowRight, ArrowUpRight, Lightbulb, Network, Sparkles, Workflow, Zap,
} from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import './closing-hub.css';

type Pillar = {
  id: string;
  title: string;
  note: string;
  Icon: LucideIcon;
  /** Tailwind classes for the card's tint. */
  card: string;
  icon: string;
  title2: string;
};

const PILLARS: Pillar[] = [
  {
    id: 'ideas',
    title: 'Ideas',
    note: 'Brainstorm freely',
    Icon: Lightbulb,
    card: 'chub-card--purple',
    icon: 'chub-icon--purple',
    title2: 'chub-title--purple',
  },
  {
    id: 'diagrams',
    title: 'Diagrams',
    note: 'Organize visually',
    Icon: Network,
    card: 'chub-card--green',
    icon: 'chub-icon--green',
    title2: 'chub-title--green',
  },
  {
    id: 'workflows',
    title: 'Workflows',
    note: 'Build step by step',
    Icon: Zap,
    card: 'chub-card--amber',
    icon: 'chub-icon--amber',
    title2: 'chub-title--amber',
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    note: 'Work together',
    Icon: Workflow,
    card: 'chub-card--blue',
    icon: 'chub-icon--blue',
    title2: 'chub-title--blue',
  },
];

/** Where each card sits, in percentages of the hub box. */
const POSITIONS: Record<string, string> = {
  ideas: 'chub-slot--tl',
  diagrams: 'chub-slot--tr',
  workflows: 'chub-slot--bl',
  collaboration: 'chub-slot--br',
};

/** Collaborators shown as cursors on the board. */
const CURSORS = [
  { id: 'c1', initials: 'A', tone: 'chub-avatar--sand', pos: 'chub-cursor--one', pointer: 'chub-pointer--rose' },
  { id: 'c2', initials: 'R', tone: 'chub-avatar--mint', pos: 'chub-cursor--two', pointer: 'chub-pointer--green' },
  { id: 'c3', initials: 'M', tone: 'chub-avatar--blue', pos: 'chub-cursor--three', pointer: 'chub-pointer--violet' },
  { id: 'c4', initials: 'K', tone: 'chub-avatar--lilac', pos: 'chub-cursor--four', pointer: 'chub-pointer--teal' },
];

export default function ClosingHub() {
  const frameRef = useRef<HTMLDivElement>(null);

  // A slow, almost imperceptible drift on the whole hub so the board reads as
  // alive rather than as a static diagram.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return;
  }, []);

  return (
    <section id="cap-finale" className="capx-reveal closing-hub">
      <div className="closing-hub__grid">
        {/* ---- Copy ---- */}
        <div className="closing-hub__copy">
          <p className="closing-hub__eyebrow">
            <span aria-hidden="true" />
            Visualize ideas faster with AI
          </p>

          <h2>
            Everything you need to
            <br />
            <em>visualize, collaborate, and build.</em>
          </h2>

          <p className="closing-hub__body">
            From brainstorming to beautiful diagrams — map ideas, connect concepts, and turn complexity into clarity.
          </p>

          <div className="closing-hub__actions">
            <Link href="/dashboard" className="button button-dark">
              Start creating <ArrowRight size={16} />
            </Link>
            <a href="#cap-01" className="button">
              See what you can build <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="closing-hub__trust">
            <div className="closing-hub__avatars" aria-hidden="true">
              <span className="chub-avatar--sand">A</span>
              <span className="chub-avatar--mint">R</span>
              <span className="chub-avatar--blue">M</span>
              <span className="chub-avatar--lilac">K</span>
            </div>
            <span>
              Trusted by 10,000+ creators, students, and teams worldwide.
            </span>
          </div>
        </div>

        {/* ---- The hub ---- */}
        <div className="closing-hub__visual">
          <div ref={frameRef} className="chub-frame">
            <div className="chub-wash" aria-hidden="true" />

            {/* Connectors from the hub out to each pillar. */}
            <svg
              className="chub-links"
              viewBox="0 0 520 400"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path className="chub-link chub-link--purple" d="M260 200 C222 188 150 148 112 100" />
              <path className="chub-link chub-link--green" d="M260 200 C300 188 372 148 406 100" />
              <path className="chub-link chub-link--amber" d="M260 200 C228 218 170 252 122 282" />
              <path className="chub-link chub-link--blue" d="M260 200 C300 218 366 256 412 290" />
              {/* A loose dashed flourish, as in the reference. */}
              <path className="chub-link chub-link--dashed" d="M60 360 C110 392 150 336 96 318" />
            </svg>

            {/* Hand-written notes in the margins. */}
            <p className="chub-note chub-note--start">
              Your ideas
              <br />
              start here
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="M4 4C10 12 14 18 20 20M20 20L14 20M20 20L19 14" />
              </svg>
            </p>
            <p className="chub-note chub-note--clarity">
              Turn complexity
              <br />
              into clarity
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="M4 4C10 12 14 18 20 20M20 20L14 20M20 20L19 14" />
              </svg>
            </p>

            {/* Collaborators, present on the board. */}
            {CURSORS.map((cursor) => (
              <span key={cursor.id} className={`chub-cursor ${cursor.pos}`} aria-hidden="true">
                <span className={`chub-avatar ${cursor.tone}`}>{cursor.initials}</span>
                <svg className={`chub-pointer ${cursor.pointer}`} viewBox="0 0 24 24">
                  <path d="M4 4l16 8-8 2-2 8z" />
                </svg>
              </span>
            ))}

            {/* The four pillars, around the hub. */}
            {PILLARS.map((pillar) => {
              const Icon = pillar.Icon;
              return (
                <div key={pillar.id} className={`chub-slot ${POSITIONS[pillar.id]}`}>
                  <div className={`chub-card ${pillar.card}`}>
                    <span className={`chub-card__icon ${pillar.icon}`}>
                      <Icon size={19} />
                    </span>
                    <span className="chub-card__text">
                      <strong className={pillar.title2}>{pillar.title}</strong>
                      <small>{pillar.note}</small>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* The hub itself. */}
            <div className="chub-hub">
              <span className="chub-hub__mark" aria-hidden="true">
                <Sparkles size={17} />
              </span>
              <strong>ScribeBoard</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
