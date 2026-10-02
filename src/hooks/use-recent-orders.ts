"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * A localStorage-backed list of recent order codes the customer has submitted.
 *
 * Stored as a JSON array of `{ code, createdAt }` objects (newest first),
 * capped at 10 entries. Used by the /track page to show "سفارش‌های اخیر"
 * so the customer can re-track a previous order without remembering the code.
 *
 * SSR-safe: `useSyncExternalStore` with a server snapshot of `[]` prevents
 * hydration mismatches. The actual localStorage read happens on mount.
 */

const STORAGE_KEY = "lamfood-recent-orders"
const MAX_ENTRIES = 10

export interface RecentOrder {
  /** The order's publicCode (e.g. "LF-7K3X9"). */
  code: string
  /** ISO timestamp of when the order was submitted (for display). */
  createdAt: string
  /** Total price in «هزار تومان» units (snapshot from the order submit). */
  total: number
}

/* ------------------------------------------------------------------ */
/* Low-level localStorage access (shared between the hook + the adder) */
/* ------------------------------------------------------------------ */

function readFromStorage(): RecentOrder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (o): o is RecentOrder =>
          o && typeof o === "object" &&
          typeof o.code === "string" &&
          typeof o.createdAt === "string" &&
          typeof o.total === "number",
      )
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

function writeToStorage(orders: RecentOrder[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ENTRIES)))
    // Notify any subscribed hooks that the store changed.
    window.dispatchEvent(new CustomEvent("lamfood:recent-orders-change"))
  } catch {
    // localStorage might be full or disabled — silent.
  }
}

/* ------------------------------------------------------------------ */
/* useSyncExternalStore plumbing                                       */
/* ------------------------------------------------------------------ */

const CHANGE_EVENT = "lamfood:recent-orders-change"

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

/** Server snapshot — always empty (no localStorage on the server). */
function getServerSnapshot(): RecentOrder[] {
  return []
}

/** Client snapshot — reads from localStorage. Returns a stable reference
 *  per distinct list (parsed fresh each call, but React compares by
 *  `Object.is` so a new array always triggers a re-render — that's fine
 *  because we only re-read on the custom event). */
let cachedSnapshot: RecentOrder[] = []
let cachedRaw = ""

function getClientSnapshot(): RecentOrder[] {
  if (typeof window === "undefined") return getServerSnapshot()
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? ""
  if (raw === cachedRaw) return cachedSnapshot
  cachedRaw = raw
  cachedSnapshot = readFromStorage()
  return cachedSnapshot
}

/* ------------------------------------------------------------------ */
/* Public hook + helpers                                               */
/* ------------------------------------------------------------------ */

/** React hook that returns the list of recent orders (newest first).
 *  Re-renders when the list changes (via the custom event dispatched by
 *  `addRecentOrder`). */
export function useRecentOrders(): RecentOrder[] {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

/** Add an order to the recent-orders list. Deduplicates by code (if the
 *  customer re-submits the same code, it moves to the top). Called by the
 *  BasketSheet on successful order submission. */
export function addRecentOrder(order: RecentOrder): void {
  const current = readFromStorage()
  // Remove any existing entry with the same code (dedupe).
  const filtered = current.filter((o) => o.code !== order.code)
  // Prepend the new entry + cap at MAX_ENTRIES.
  writeToStorage([order, ...filtered].slice(0, MAX_ENTRIES))
}

/** Remove a single order from the recent-orders list (e.g. if the customer
 *  clears their history). */
export function removeRecentOrder(code: string): void {
  const current = readFromStorage()
  writeToStorage(current.filter((o) => o.code !== code))
}

/** Clear all recent orders. */
export function clearRecentOrders(): void {
  writeToStorage([])
}
