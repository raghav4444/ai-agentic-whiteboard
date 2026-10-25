import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-[#151714]/12 bg-[rgba(255,252,245,0.55)] px-3.5 py-2.5 text-base text-[#151714] shadow-[inset_0_1px_2px_rgba(21,23,20,0.045),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition-[color,box-shadow,border-color,background-color] duration-150 ease-[var(--ease-out)] outline-none placeholder:text-[#6c726d]/65 focus-visible:border-black/25 focus-visible:bg-[rgba(255,253,247,0.88)] focus-visible:ring-2 focus-visible:ring-black/10 dark:border-white/12 dark:bg-white/[0.04] dark:text-[#f4f2ea] dark:placeholder:text-white/35 dark:focus-visible:border-white/25 dark:focus-visible:bg-white/[0.07] dark:focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-[13px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
