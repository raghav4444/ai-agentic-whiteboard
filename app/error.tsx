'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from '@/lib/icons';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="glass-app flex min-h-screen w-full flex-col items-center justify-center px-4 py-12 text-[#151714]">
      <div className="relative mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-[#151714]/10 bg-white/70 shadow-sm backdrop-blur-md">
          <span className="text-2xl">⚠️</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-[#151714]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[#6c726d]">
          An unexpected error occurred while loading this view. You can try refreshing or return to your dashboard.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#151714] px-4 text-xs font-semibold text-[#faf9f6] transition-transform active:scale-95 hover:bg-[#151714]/90"
          >
            <RotateCcw size={13} />
            <span>Try again</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#151714]/15 bg-white/60 px-4 text-xs font-semibold text-[#151714] transition-transform active:scale-95 hover:bg-white/80"
          >
            <ArrowLeft size={13} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
