import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { auth } from '@clerk/nextjs/server'
import AppHeader from '@/components/custom/dashboard/AppHeader'
import { AppSidebar } from '@/components/custom/dashboard/AppSidebar'
import GlassEffects from '@/components/custom/glass/GlassEffects'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await auth.protect()

  return (
    <SidebarProvider className="glass-app">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <GlassEffects />
    </SidebarProvider>
  )
}

export default DashboardLayout
