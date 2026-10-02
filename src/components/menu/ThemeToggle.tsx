"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Light/dark mode toggle button — flips the `.dark` class on `<html>` and
 * persists the choice to localStorage. Animated sun↔moon swap with a 250ms
 * rotation; respects `prefers-color-scheme: dark` on first visit.
 *
 * Decoupled from `next-themes` (we manage the class ourselves) so we can keep
 * `applyTheme()` in sync — when the mode flips, derived tokens must be
 * recomputed against the new surface/foreground pair, which the
 * `ThemeProvider` cannot do automatically. We dispatch a custom
 * `lamfood:theme-mode-change` event that the ThemeProvider listens for and
 * re-applies the brand theme.
 *
 * SSR-safe: renders a stable placeholder until mounted (no hydration mismatch).
 * The "is dark mode?" state is read via `useSyncExternalStore` — the
 * React-recommended pattern for subscribing to external state (the DOM class
 * list) without triggering cascading renders.
 */

const THEME_MODE_EVENT = "lamfood:theme-mode-change"

/** Subscribe to theme-mode changes (the custom event we dispatch on toggle). */
function subscribeThemeMode(callback: () => void): () => void {
  window.addEventListener(THEME_MODE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(THEME_MODE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

/** Read the current theme mode from the DOM (client-only snapshot). */
function readThemeMode(): boolean {
  return document.documentElement.classList.contains("dark")
}

/** SSR snapshot — we always render light mode on the server (the inline
 *  script in layout.tsx will set `.dark` before hydration if needed, and
 *  the useSyncExternalStore re-renders after mount). */
function readThemeModeServer(): boolean {
  return false
}

export default function ThemeToggle({ className }: { className?: string }) {
  // useSyncExternalStore: React's recommended way to read external mutable
  // state (the `.dark` class) without cascading renders. The third arg
  // (serverSnapshot) keeps SSR output stable (always light), and the inline
  // script in layout.tsx sets `.dark` before hydration if needed.
  const isDark = useSyncExternalStore(
    subscribeThemeMode,
    readThemeMode,
    readThemeModeServer,
  )

  function toggle() {
    const next = !isDark
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("lamfood-theme-mode", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("lamfood-theme-mode", "light")
    }
    // Notify ThemeProvider to re-derive tokens against the new mode.
    window.dispatchEvent(new CustomEvent(THEME_MODE_EVENT))
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "روشن کردن صفحه" : "تاریک کردن صفحه"}
      aria-pressed={isDark}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
      className={cn(
        "relative h-11 w-11 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      {/* Sun: visible in light mode, slides out in dark mode */}
      <Sun
        className={cn(
          "absolute size-5 transition-all duration-300",
          isDark
            ? "-translate-y-8 rotate-90 opacity-0"
            : "translate-y-0 rotate-0 opacity-100",
        )}
        aria-hidden
      />
      {/* Moon: visible in dark mode, slides out in light mode */}
      <Moon
        className={cn(
          "absolute size-5 transition-all duration-300",
          isDark
            ? "translate-y-0 rotate-0 opacity-100"
            : "translate-y-8 -rotate-90 opacity-0",
        )}
        aria-hidden
      />
    </Button>
  )
}

/**
 * Hook for components that need to re-run their theme-derivation when the
 * light/dark mode flips. Returns the current mode (false on the server).
 */
export function useThemeMode(): boolean {
  return useSyncExternalStore(
    subscribeThemeMode,
    readThemeMode,
    readThemeModeServer,
  )
}
