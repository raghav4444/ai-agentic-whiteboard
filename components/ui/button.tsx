import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-[12px] font-semibold tracking-[-0.005em] whitespace-nowrap outline-none select-none transition-[transform,background-color,border-color,color,box-shadow,opacity,filter] duration-150 ease-[var(--ease-out)] hover:-translate-y-px active:translate-y-0 active:not-aria-[haspopup]:scale-[0.96] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[#151714] bg-[#151714] text-[#faf9f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_18px_-12px_rgba(21,23,20,0.75)] hover:border-[#065f46] hover:bg-[#065f46] aria-expanded:border-[#065f46] aria-expanded:bg-[#065f46]",
        outline:
          "border-[#151714]/12 bg-[rgba(255,252,245,0.5)] text-[#151714] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl hover:border-[#2aab70]/35 hover:bg-[rgba(255,253,247,0.82)] aria-expanded:bg-[rgba(255,253,247,0.82)]",
        secondary:
          "border-[#e5e5e1] bg-[#fcf6e8]/70 text-[#151714] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl hover:border-[#2aab70]/30 hover:bg-[#fcf6e8] aria-expanded:bg-[#fcf6e8]",
        ghost:
          "text-[#6c726d] hover:bg-[rgba(21,23,20,0.055)] hover:text-[#151714] aria-expanded:bg-[rgba(21,23,20,0.055)] aria-expanded:text-[#151714]",
        destructive:
          "border-rose-200/70 bg-rose-500/10 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl hover:bg-rose-500/16 focus-visible:ring-destructive/25",
        inverse:
          "border-[#faf9f6] bg-[#faf9f6] text-[#151714] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_-14px_rgba(0,0,0,0.55)] hover:border-[#fcf6e8] hover:bg-[#fcf6e8]",
        onDark:
          "border-white/16 bg-white/8 text-[#f7f4eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl hover:border-white/28 hover:bg-white/14",
        link: "text-[#065f46] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 px-2 text-[10px] in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 in-data-[slot=button-group]:rounded-full",
        lg: "h-10 gap-2 px-4.5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
