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
 * ## Light vs dark mode
 * The user picks 6 brand colors (primary, accent, background, foreground, ...).
 * Those represent the *light-mode* brand palette. In dark mode we keep the
 * user's `primary` and `accent` (so the brand identity is preserved) but
 * override `background` and `foreground` with our own dark-mode neutrals
 * (deep teal-tinted dark surface + soft off-white text), and derive everything
 * else from those — so the page stays readable in both modes without requiring
 * the admin to pick 12 colors.
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
    let cachedTheme: ThemeColors | null = null

    const loadAndApply = () => {
      fetch("/api/config")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
        .then((data) => {
          if (cancelled) return
          const theme = (data as PublicConfigResponse).restaurant?.theme
          if (!theme) return
          cachedTheme = theme
          applyTheme(theme)
        })
        .catch(() => {
          /* keep whatever theme was last applied (falls back to globals.css) */
        })
    }

    loadAndApply()

    // When the user flips light/dark mode (via ThemeToggle), re-derive the
    // tokens against the new surface/foreground pair. We can't just read the
    // CSS variables because the derived tokens (muted-foreground, border, ...)
    // need to be recomputed from the user's brand palette against the *new*
    // background, which is what `applyTheme()` does.
    const onModeChange = () => {
      if (cachedTheme) applyTheme(cachedTheme)
    }
    window.addEventListener("lamfood:theme-mode-change", onModeChange)

    return () => {
      cancelled = true
      window.removeEventListener("lamfood:theme-mode-change", onModeChange)
    }
  }, [])

  return null
}

/** Whether the document is currently in dark mode (has the `.dark` class). */
function isDarkMode(): boolean {
  if (typeof document === "undefined") return false
  return document.documentElement.classList.contains("dark")
}

/** Re-apply the brand theme. Call this when the dark/light mode changes so the
 *  derived tokens recompute against the right surface/foreground pair. */
export function reapplyTheme(theme: ThemeColors) {
  applyTheme(theme)
}

export function applyTheme(theme: ThemeColors) {
  const root = document.documentElement
  const dark = isDarkMode()

  // In dark mode we override the user's background/foreground with dark-mode
  // neutrals — but keep their primary/accent so the brand identity is intact.
  const bg = dark ? DARK.background : theme.background
  const fg = dark ? DARK.foreground : theme.foreground
  const card = dark ? DARK.card : bg
  const popover = dark ? DARK.popover : bg
  const primary = theme.primary
  const primaryFg = theme.primaryForeground
  const accent = theme.accent
  const accentFg = theme.accentForeground

  // 1) Apply the 6 (or dark-overridden) user-controlled tokens directly.
  root.style.setProperty("--primary", primary)
  root.style.setProperty("--primary-foreground", primaryFg)
  root.style.setProperty("--accent", accent)
  root.style.setProperty("--accent-foreground", accentFg)
  root.style.setProperty("--background", bg)
  root.style.setProperty("--foreground", fg)

  // 2) Derived surface tokens — keep the page readable without forcing the
  //    admin to pick every single variable. In light mode we blend the brand
  //    color onto the background at small alpha values; in dark mode we use
  //    white-overlaid surfaces (so muted/secondary track the dark surface).
  const surfaceMix = dark
    ? (base: string, alpha: number) => `color-mix(in srgb, ${base} ${alpha}%, ${bg})`
    : (base: string, alpha: number) => `color-mix(in srgb, ${base} ${alpha}%, ${bg})`

  root.style.setProperty("--secondary", surfaceMix(primary, 14))
  root.style.setProperty("--secondary-foreground", mixToHex(primary, fg, 0.75))
  root.style.setProperty("--muted", surfaceMix(primary, 8))
  // muted-foreground: in dark mode use a lighter mix (foreground→bg, 0.7);
  // in light mode use the heavier weight from round 2 (0.72) for WCAG AA.
  root.style.setProperty(
    "--muted-foreground",
    dark ? mixToHex(fg, bg, 0.7) : mixToHex(fg, bg, 0.72),
  )
  // Borders are subtle white overlays in dark mode; brand-tinted in light mode.
  root.style.setProperty(
    "--border",
    dark ? "rgba(255, 255, 255, 0.12)" : surfaceMix(primary, 18),
  )
  root.style.setProperty(
    "--input",
    dark ? "rgba(255, 255, 255, 0.16)" : surfaceMix(primary, 25),
  )
  root.style.setProperty("--ring", primary)

  // 3) Card / popover surfaces follow the background, and their foreground
  //    follows the body foreground — so they update when the admin picks a
  //    new background or foreground color.
  root.style.setProperty("--card", card)
  root.style.setProperty("--card-foreground", fg)
  root.style.setProperty("--popover", popover)
  root.style.setProperty("--popover-foreground", fg)

  // 4) Sidebar tokens — keep the admin sidebar in sync with the brand palette.
  root.style.setProperty("--sidebar", card)
  root.style.setProperty("--sidebar-foreground", fg)
  root.style.setProperty("--sidebar-primary", primary)
  root.style.setProperty("--sidebar-primary-foreground", primaryFg)
  root.style.setProperty("--sidebar-accent", surfaceMix(primary, 14))
  root.style.setProperty(
    "--sidebar-accent-foreground",
    mixToHex(primary, fg, 0.7),
  )
  root.style.setProperty(
    "--sidebar-border",
    dark ? "rgba(255, 255, 255, 0.12)" : surfaceMix(primary, 18),
  )
  root.style.setProperty("--sidebar-ring", primary)

  // 5) Chart palette — derive 5 chart colors from the brand primary/accent.
  root.style.setProperty("--chart-1", primary)
  root.style.setProperty("--chart-2", accent)
  root.style.setProperty("--chart-3", surfaceMix(primary, 40))
  root.style.setProperty("--chart-4", surfaceMix(accent, 45))
  root.style.setProperty("--chart-5", mixToHex(primary, fg, 0.4))

  // 6) Update the browser UI / theme-color meta as well.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", dark ? bg : primary)
}

/**
 * Dark-mode neutrals — a deep teal-tinted surface and a soft off-white text.
 * These are intentionally NOT user-configurable (so the admin only has to pick
 * 6 colors, not 12); they pair well with the default LamFood teal brand but
 * also work with any primary/accent the admin picks.
 */
const DARK = {
  background: "#0b1f23",
  foreground: "#e8eef0",
  card: "#102a30",
  popover: "#102a30",
} as const

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
