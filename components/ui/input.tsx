import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-[#151714]/12 bg-[rgba(255,252,245,0.55)] px-3.5 py-1 text-base text-[#151714] shadow-[inset_0_1px_2px_rgba(21,23,20,0.045),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition-[color,box-shadow,border-color,background-color] duration-150 ease-[var(--ease-out)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#151714] placeholder:text-[#6c726d]/65 focus-visible:border-[#2aab70]/45 focus-visible:bg-[rgba(255,253,247,0.88)] focus-visible:ring-3 focus-visible:ring-[#2aab70]/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-[13px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
