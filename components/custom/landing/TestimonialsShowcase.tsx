'use client';

import { useState } from 'react';
import { Check, Pause, Play } from '@/lib/icons';

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initials: string;
  tone: 'mint' | 'blue' | 'sand' | 'lilac' | 'rose' | 'slate';
};

const TESTIMONIAL_ROWS: Testimonial[][] = [
  [
    {
      name: 'Maya Chen',
      role: 'Staff Engineer, Northstar',
      quote: 'We went from a scattered Slack thread to a diagram the whole room could challenge in under ten minutes.',
      initials: 'MC',
      tone: 'mint',
    },
    {
      name: 'Jon Bell',
      role: 'Product Lead, Relay',
      quote: 'The useful part is not the AI magic. It is having a shared surface where the magic becomes a decision.',
      initials: 'JB',
      tone: 'blue',
    },
    {
      name: 'Priya Nair',
      role: 'Platform Architect, Kestrel',
      quote: 'Our architecture reviews finally feel like conversations instead of archaeology.',
      initials: 'PN',
      tone: 'sand',
    },
  ],
  [
    {
      name: 'Owen Wright',
      role: 'Design Systems, Common Room',
      quote: 'A calm, quick way to make the hidden shape of a problem visible.',
      initials: 'OW',
      tone: 'lilac',
    },
    {
      name: 'Lena Ortiz',
      role: 'Engineering Manager, Atlas',
      quote: 'The first draft finally gives everyone something concrete to improve together.',
      initials: 'LO',
      tone: 'rose',
    },
    {
      name: 'Samir Rao',
      role: 'Founder, Field Notes',
      quote: 'It keeps the original question visible long after the system gets complicated.',
      initials: 'SR',
      tone: 'slate',
    },
  ],
];

export function TestimonialsShowcase() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <section className={`scribe-testimonials ${isPaused ? 'scribe-testimonials-paused' : ''}`} aria-labelledby="scribe-testimonials-title">
      <div className="scribe-testimonials-heading">
        <span className="scribe-testimonials-eyebrow">The people behind the work</span>
        <h2 id="scribe-testimonials-title">Good work travels<br /><em>person to person.</em></h2>
        <div className="scribe-testimonials-heading-row">
          <p>Teams using ScribeBoard to turn a first thought into something everyone can move forward with.</p>
          <button
            type="button"
            className="scribe-testimonials-toggle"
            onClick={() => setIsPaused((paused) => !paused)}
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Resume testimonial marquee' : 'Pause testimonial marquee'}
          >
            {isPaused ? <Play size={12} fill="currentColor" aria-hidden="true" /> : <Pause size={12} fill="currentColor" aria-hidden="true" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      <div className="scribe-testimonial-marquee" aria-label="ScribeBoard testimonials">
        {TESTIMONIAL_ROWS.map((row, rowIndex) => (
          <div className={`scribe-testimonial-track scribe-testimonial-track-${rowIndex}`} key={rowIndex}>
            {[...row, ...row].map((testimonial, index) => (
              <article className="scribe-testimonial-card" key={`${testimonial.name}-${index}`} aria-hidden={index >= row.length}>
                <div className={`scribe-testimonial-avatar scribe-testimonial-avatar-${testimonial.tone}`} aria-label={`${testimonial.name} avatar`}>
                  <span>{testimonial.initials}</span>
                  <span className="scribe-testimonial-check" aria-hidden="true"><Check size={10} strokeWidth={3} /></span>
                </div>
                <div className="scribe-testimonial-copy">
                  <p>“{testimonial.quote}”</p>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.role}</small>
                </div>
                <span className="scribe-testimonial-mark">01 / COLLAB</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default TestimonialsShowcase;
