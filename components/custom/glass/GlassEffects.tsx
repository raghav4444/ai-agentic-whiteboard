"use client"

import { useEffect } from "react"

const PRESSABLE =
  'button, [data-slot="button"], [role="button"], a[href], [data-glass-press]'

/**
 * Global tactile press feedback for interactive controls.
 * Pointer-tracking torch/spotlight has been removed for a clean, calm obsidian surface.
 */
export default function GlassEffects() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const coarsePointer = window.matchMedia("(pointer: coarse)")

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || reducedMotion.matches) return

      const target = event.target as Element | null
      const control = target?.closest<HTMLElement>(PRESSABLE)
      if (!control) return
      if (control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") return
      if (control.hasAttribute("data-no-press")) return

      const rect = control.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const size = Math.min(Math.max(Math.max(rect.width, rect.height) * 1.7, 44), 320)
      const x = coarsePointer.matches ? rect.left + rect.width / 2 : event.clientX
      const y = coarsePointer.matches ? rect.top + rect.height / 2 : event.clientY

      const glow = document.createElement("span")
      glow.className = "glass-click-glow"
      glow.setAttribute("aria-hidden", "true")
      glow.style.width = `${size}px`
      glow.style.height = `${size}px`
      glow.style.left = `${x}px`
      glow.style.top = `${y}px`

      document.body.appendChild(glow)

      const animation = glow.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.24)", opacity: 0.85 },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
        ],
        {
          duration: 460,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
          fill: "forwards",
        }
      )

      const cleanup = () => glow.remove()
      animation.addEventListener("finish", cleanup, { once: true })
      animation.addEventListener("cancel", cleanup, { once: true })
    }

    document.addEventListener("pointerdown", handlePointerDown, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [])

  return null
}
