import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { AppSidebar } from '@/components/custom/dashboard/AppSidebar'
import GlassEffects from '@/components/custom/glass/GlassEffects'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await auth.protect()

  return (
    <SidebarProvider defaultOpen={false} className="dark min-h-screen bg-[#0a0d0b] text-[#f4f2ea]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-3 sm:px-6 sm:py-5">
          {children}
        </main>
      </div>
      <GlassEffects />
    </SidebarProvider>
  )
}

export default DashboardLayout
