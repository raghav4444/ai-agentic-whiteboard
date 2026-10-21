import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import LandingNav from '@/components/custom/landing/LandingNav';
import CapabilitiesShowcase from '@/components/custom/landing/CapabilitiesShowcase';

export const metadata: Metadata = {
  title: 'Capabilities | ScribeBoard',
  description: 'Explore the visual tools that turn your ideas into diagrams, editable canvases, and shared understanding with ScribeBoard.',
};

export default function CapabilitiesPage() {
  return (
    <div className="landing-page sb-cap-page">
      <LandingNav active="capabilities" showSound />
      <CapabilitiesShowcase />
      <footer className="landing-footer cap-reference-footer">
        <div className="cap-reference-footer-brand">
          <Link href="/" className="brand-mark">
            <Image src="/logo.svg" alt="" width={24} height={24} />
            <span>Scribe<span>Board</span></span>
          </Link>
          <span>© 2026. Built for thinking out loud.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#hero">Back to top ↑</a>
          <a href="#hero">Privacy</a>
          <a href="#hero">Terms</a>
          <a href="#hero">Status</a>
        </nav>
      </footer>
    </div>
  );
}
