import ProjectList from '@/components/custom/dashboard/ProjectList'
import WelcomeBanner from '@/components/custom/dashboard/WelcomeBanner'
import React from 'react'

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

function DashboardPage() {
  if (!isClerkConfigured) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-slate-200">
        <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
        <p className="mt-2 text-slate-400">
          Add your Clerk keys and database env variables to enable the whiteboard dashboard.
        </p>
      </div>
    );
  }

  return (
    <div>
      <WelcomeBanner />
      <section aria-label="Your boards">
        <ProjectList />
      </section>
    </div>
  )
}

export default DashboardPage
