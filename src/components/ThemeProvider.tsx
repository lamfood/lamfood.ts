"use client"

import { useEffect } from "react"

import type { PublicConfigResponse, ThemeColors } from "@/lib/types"

/**
 * Map of the 6 user-controlled CSS variable names (on :root) that we read from
 * config.json. Derived tokens are recomputed from these in `applyTheme()`.
 */
const THEME_VAR_KEYS: Record<keyof ThemeColors, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  foreground: "--foreground",
}

/**
 * Applies the saved brand colors from config.json to the live document as CSS
 * variables, so every Tailwind token (bg-primary, text-foreground, ...) updates
 * instantly across the site.
 *
 * In addition to the 6 user-controlled colors, we derive every other design
 * token (secondary, muted, border, input, ring, card, popover, sidebar, charts,
 * and *all* of their `-foreground` siblings) from the brand palette so the whole
 * UI stays coherent when the admin picks a new primary/accent/background color.
 *
 * This is the bug fix for: "admin color setting — few colors don't change".
 * Previously, several tokens (secondary-foreground, muted-foreground,
 * card-foreground, popover-foreground, sidebar-*, chart-*) were left at their
 * hardcoded globals.css values, so changing the brand palette didn't update
 * them.
 */
export default function ThemeProvider() {
  useEffect(() => {
    let cancelled = false

    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (cancelled) return
        const theme = (data as PublicConfigResponse).restaurant?.theme
        if (!theme) return
        applyTheme(theme)
      })
      .catch(() => {
        /* keep whatever theme was last applied (falls back to globals.css) */
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

export function applyTheme(theme: ThemeColors) {
  const root = document.documentElement

  // 1) Apply the 6 user-controlled tokens directly.
  for (const key of Object.keys(THEME_VAR_KEYS) as (keyof ThemeColors)[]) {
    root.style.setProperty(THEME_VAR_KEYS[key], theme[key])
  }

  // 2) Derived surface tokens — keep the page readable without forcing the
  //    admin to pick every single variable. These blend the brand color onto
  //    the background at small alpha values so muted/secondary/border track the
  //    chosen palette instead of staying frozen at the default teal.
  root.style.setProperty("--secondary", colorMix(theme.primary, theme.background, 0.08))
  root.style.setProperty("--secondary-foreground", mixToHex(theme.primary, theme.foreground, 0.55))
  root.style.setProperty("--muted", colorMix(theme.primary, theme.background, 0.05))
  root.style.setProperty(
    "--muted-foreground",
    mixToHex(theme.foreground, theme.background, 0.55),
  )
  root.style.setProperty("--border", colorMix(theme.primary, theme.background, 0.18))
  root.style.setProperty("--input", colorMix(theme.primary, theme.background, 0.25))
  root.style.setProperty("--ring", theme.primary)

  // 3) Card / popover surfaces follow the background, and their foreground
  //    follows the body foreground — so they update when the admin picks a
  //    new background or foreground color.
  root.style.setProperty("--card", theme.background)
  root.style.setProperty("--card-foreground", theme.foreground)
  root.style.setProperty("--popover", theme.background)
  root.style.setProperty("--popover-foreground", theme.foreground)

  // 4) Sidebar tokens — keep the admin sidebar in sync with the brand palette.
  root.style.setProperty("--sidebar", theme.background)
  root.style.setProperty("--sidebar-foreground", theme.foreground)
  root.style.setProperty("--sidebar-primary", theme.primary)
  root.style.setProperty("--sidebar-primary-foreground", theme.primaryForeground)
  root.style.setProperty("--sidebar-accent", colorMix(theme.primary, theme.background, 0.08))
  root.style.setProperty(
    "--sidebar-accent-foreground",
    mixToHex(theme.primary, theme.foreground, 0.55),
  )
  root.style.setProperty("--sidebar-border", colorMix(theme.primary, theme.background, 0.18))
  root.style.setProperty("--sidebar-ring", theme.primary)

  // 5) Chart palette — derive 5 chart colors from the brand primary/accent.
  //    Charts aren't shown on the public menu but admin pages may use them;
  //    keeping them on-brand avoids the "default teal chart" surprise.
  root.style.setProperty("--chart-1", theme.primary)
  root.style.setProperty("--chart-2", theme.accent)
  root.style.setProperty("--chart-3", colorMix(theme.primary, theme.background, 0.4))
  root.style.setProperty("--chart-4", colorMix(theme.accent, theme.background, 0.45))
  root.style.setProperty("--chart-5", mixToHex(theme.primary, theme.foreground, 0.35))

  // 6) Update the browser UI / theme-color meta as well.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", theme.primary)
}

/** Mix two hex colors by alpha in sRGB (CSS color-mix). Returns a CSS color. */
function colorMix(base: string, onto: string, alpha: number): string {
  return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, ${onto})`
}

/**
 * Numeric sRGB mix of two hex colors, returned as a hex string. Used where we
 * need an actual hex value (e.g. for `-foreground` tokens that some libs read
 * as hex) rather than a CSS color-mix expression.
 */
function mixToHex(colorA: string, colorB: string, weightA: number): string {
  const a = parseHex(colorA)
  const b = parseHex(colorB)
  if (!a || !b) return colorA
  const w = Math.max(0, Math.min(1, weightA))
  const r = Math.round(a[0] * w + b[0] * (1 - w))
  const g = Math.round(a[1] * w + b[1] * (1 - w))
  const bl = Math.round(a[2] * w + b[2] * (1 - w))
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`
}

function parseHex(value: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.test(value)
    ? value.replace(/^#/, "")
    : /^#?([0-9a-fA-F]{3})$/.test(value)
      ? value
          .replace(/^#/, "")
          .split("")
          .map((c) => c + c)
          .join("")
      : null
  if (!m) return null
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return [r, g, b]
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0")
}
