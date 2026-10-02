"use client"

import { useEffect } from "react"

import type { PublicConfigResponse, ThemeColors } from "@/lib/types"

/** Map of CSS variable names (on :root) that we control via the theme. */
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
 * instantly across the site. Derived tokens (secondary, muted, border, input,
 * ring) are computed from primary/background for a coherent look.
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
  for (const key of Object.keys(THEME_VAR_KEYS) as (keyof ThemeColors)[]) {
    root.style.setProperty(THEME_VAR_KEYS[key], theme[key])
  }

  // Derived tokens — keep the page readable without forcing the admin to pick
  // every single variable.
  root.style.setProperty("--secondary", colorMix(theme.primary, theme.background, 0.08))
  root.style.setProperty("--muted", colorMix(theme.primary, theme.background, 0.05))
  root.style.setProperty("--border", colorMix(theme.primary, theme.background, 0.18))
  root.style.setProperty("--input", colorMix(theme.primary, theme.background, 0.25))
  root.style.setProperty("--ring", theme.primary)
  root.style.setProperty("--card", theme.background)
  root.style.setProperty("--popover", theme.background)

  // Keep the sidebar in sync with the brand color.
  root.style.setProperty("--sidebar", theme.background)
  root.style.setProperty("--sidebar-primary", theme.primary)
  root.style.setProperty("--sidebar-ring", theme.primary)

  // Update the browser UI / theme-color meta as well.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", theme.primary)
}

/** Mix two hex colors by alpha in sRGB (CSS color-mix). */
function colorMix(base: string, onto: string, alpha: number): string {
  return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, ${onto})`
}