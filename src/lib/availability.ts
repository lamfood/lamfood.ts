"use client"

/**
 * Client-side item availability checker — mirrors the server-side
 * `isItemAvailableNow()` in `src/lib/menu-items.ts` but without the
 * `server-only` import so it can be used in client components.
 *
 * Checks whether an item is available at the current Tehran local time,
 * based on its `availableFrom`/`availableTo` window.
 */

/** Check if an item is available right now (Tehran local time). */
export function isItemAvailableNow(
  availableFrom: string | null,
  availableTo: string | null,
): boolean {
  if (!availableFrom || !availableTo) return true

  const fromMin = parseHM(availableFrom)
  const toMin = parseHM(availableTo)
  if (fromMin === null || toMin === null) return true

  const tehranTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())
  const nowMin = parseHM(tehranTime)
  if (nowMin === null) return true

  if (toMin <= fromMin) {
    // Overnight window (e.g. 18:00 → 02:00)
    return nowMin >= fromMin || nowMin < toMin
  }
  // Same-day window (e.g. 07:00 → 11:00)
  return nowMin >= fromMin && nowMin < toMin
}

/** Format an HH:MM time as a Persian-time string (e.g. «۷:۰۰»). */
export function formatTimeFa(hhmm: string): string {
  const parts = hhmm.split(":")
  if (parts.length !== 2) return hhmm
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n)
  return `${fa(h)}:${fa(m).padStart(2, "۰")}`
}

function parseHM(value: string): number | null {
  const parts = value.split(":")
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 24 || m < 0 || m > 59) return null
  return h * 60 + m
}
