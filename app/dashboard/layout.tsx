import AppHeader from '@/components/custom/dashboard/AppHeader'
import { AppSidebar } from '@/components/custom/dashboard/AppSideBar'
import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { auth } from '@clerk/nextjs/server'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await auth.protect()

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex min-h-screen flex-1 flex-col'>
        <AppHeader />
        <div className='p-5'>
          {children}
        </div>

      </div>
    </SidebarProvider>

  )
}

export default DashboardLayout
