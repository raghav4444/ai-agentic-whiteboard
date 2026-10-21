import type { Metadata } from 'next';
import LandingNav from '@/components/custom/landing/LandingNav';
import HowItWorksJourney from '@/components/custom/landing/HowItWorksJourney';

export const metadata: Metadata = {
  title: 'How it works | ScribeBoard',
  description: 'See how ScribeBoard turns a sentence into an editable visual system.',
};

export default function HowItWorksPage() {
  return (
    <div className="landing-page sb-how-shell">
      <LandingNav active="how-it-works" showSound />
      <HowItWorksJourney />
    </div>
  );
}
