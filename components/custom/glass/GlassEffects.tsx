"use client"

import { useEffect } from "react"

const PRESSABLE =
  'button, [data-slot="button"], [role="button"], a[href], [data-glass-press]'

const REACTIVE = "[data-glass-reactive]"

/**
 * Global material feedback for the liquid-glass surfaces.
 *
 * Apple's response rule: feedback starts on pointer-down, not on release.
 * The CSS `:active` scale lives in globals.css; this adds two things the
 * material needs to feel physical:
 *
 * 1. a specular light that tracks the pointer across a glass surface, and
 * 2. a warm light catch on press instead of a generic web ripple.
 */
export default function GlassEffects() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)")
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

      // On touch, park the light at the press point; on pointer-fine it
      // reads as light catching the surface under the cursor.
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

    // Light should not chase a finger. It is a pointer-fine material only.
    if (coarsePointer.matches || reducedMotion.matches || reducedTransparency.matches) {
      return () => document.removeEventListener("pointerdown", handlePointerDown, true)
    }

    let frame = 0
    let current: HTMLElement | null = null
    let pendingTarget: { element: HTMLElement; x: number; y: number } | null = null
    let pendingGlobal: { x: number; y: number } | null = null

    const applyLight = () => {
      frame = 0
      if (pendingGlobal) {
        document.documentElement.style.setProperty("--cursor-x", `${pendingGlobal.x}px`)
        document.documentElement.style.setProperty("--cursor-y", `${pendingGlobal.y}px`)
        pendingGlobal = null
      }
      if (pendingTarget) {
        const { element, x, y } = pendingTarget
        pendingTarget = null
        element.style.setProperty("--glass-x", `${x}px`)
        element.style.setProperty("--glass-y", `${y}px`)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      pendingGlobal = { x: event.clientX, y: event.clientY }

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(REACTIVE)
          : null

      if (target !== current) {
        current?.removeAttribute("data-glass-hover")
        current = target
        current?.setAttribute("data-glass-hover", "true")
      }

      if (target) {
        const rect = target.getBoundingClientRect()
        pendingTarget = {
          element: target,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
      }

      if (!frame) {
        frame = window.requestAnimationFrame(applyLight)
      }
    }

    const clearLight = () => {
      current?.removeAttribute("data-glass-hover")
      current = null
      pendingTarget = null
      pendingGlobal = null
      document.documentElement.style.setProperty("--cursor-x", "-999px")
      document.documentElement.style.setProperty("--cursor-y", "-999px")
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: true })
    document.addEventListener("pointerleave", clearLight)
    window.addEventListener("blur", clearLight)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerleave", clearLight)
      window.removeEventListener("blur", clearLight)
      clearLight()
    }
  }, [])

  return null
}
