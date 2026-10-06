import AppHeader from '@/components/custom/dashboard/AppHeader'
import { AppSidebar } from '@/components/custom/dashboard/AppSideBar'
import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) {
    return <div className="p-6 text-slate-200">{children}</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex flex-1 flex-col'> 
        <AppHeader />
        <div className='p-5'>
          {children}
        </div> 
        
      </div>
    </SidebarProvider>
    
  )
}

export default DashboardLayout
