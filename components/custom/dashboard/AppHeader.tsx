import { SidebarTrigger } from '@/components/ui/sidebar'
import { UserButton } from '@clerk/nextjs'
import { ChevronRight } from '@/lib/icons'
import React from 'react'

function AppHeader() {
  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div
        data-glass-reactive
        className="glass-toolbar relative mx-auto flex h-[3.75rem] max-w-[1600px] items-center justify-between gap-3 px-3.5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger className="size-11 shrink-0 rounded-full text-[#6c726d] hover:bg-[rgba(21,23,20,0.055)] hover:text-[#151714] active:scale-[0.96] sm:size-9" />

          <span className="hidden h-5 w-px bg-[#151714]/10 sm:block" />

          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 items-center gap-2.5 sm:flex"
          >
            <span className="mono-label text-[#6c726d]/75">Studio</span>
            <ChevronRight size={11} className="shrink-0 text-[#6c726d]/40" />
            <span className="truncate text-[13px] font-semibold tracking-[-0.015em] text-[#151714]">
              Overview
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="glass-chip hidden h-8 gap-2 px-3 text-[10.5px] font-semibold sm:inline-flex">
            <span className="relative flex size-1.5">
              <span className="size-1.5 rounded-full bg-[#151714]/60 dark:bg-white/70" />
            </span>
            Synced
          </span>

          <div className="ml-0.5 flex size-9 items-center justify-center">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
