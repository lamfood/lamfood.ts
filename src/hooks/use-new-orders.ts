"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { apiFetch, ApiError } from "@/lib/api"
import type { OrderListResponse } from "@/lib/types"

/**
 * Polls `/api/admin/orders?status=NEW` every `intervalMs` and reports the
 * count of new (unseen) orders. Fires a `onNew` callback the first time a
 * previously-unseen order code appears — used by the admin dashboard to
 * show a toast notification.
 *
 * Design notes:
 * - Uses a ref to track previously-seen order codes so we don't toast on
 *   every poll for the same order.
 * - Stops polling when the tab is hidden (Page Visibility API) to avoid
 *   pointless background requests; resumes when the tab becomes visible.
 * - Silent on 401 (the parent will redirect to login) and on transient
 *   network errors (just retries next interval).
 * - The first poll runs immediately on mount (so the badge is accurate
 *   before the first tick).
 */

interface UseNewOrdersOptions {
  /** Polling interval in ms. Default 30000 (30s). */
  intervalMs?: number
  /** Called with each newly-discovered order code (deduplicated). */
  onNew?: (publicCode: string) => void
  /** Called whenever the new-count changes (so the badge can update). */
  onCountChange?: (count: number) => void
}

export function useNewOrders({
  intervalMs = 30_000,
  onNew,
  onCountChange,
}: UseNewOrdersOptions = {}) {
  const [newCount, setNewCount] = useState<number>(0)
  const seenCodesRef = useRef<Set<string>>(new Set())
  const onNewRef = useRef(onNew)
  const onCountChangeRef = useRef(onCountChange)

  // Keep the callback refs fresh without re-triggering the poll effect.
  useEffect(() => {
    onNewRef.current = onNew
    onCountChangeRef.current = onCountChange
  }, [onNew, onCountChange])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      // Skip when the tab is hidden — resumes automatically on visibilitychange.
      if (typeof document !== "undefined" && document.hidden) return

      try {
        const data = await apiFetch<OrderListResponse>(
          "/api/admin/orders?status=NEW&limit=50",
        )
        if (cancelled) return

        // Detect newly-arrived orders (codes we haven't seen before).
        const incoming: string[] = []
        for (const o of data.orders) {
          if (!seenCodesRef.current.has(o.publicCode)) {
            seenCodesRef.current.add(o.publicCode)
            // Only toast for orders that arrived AFTER the first poll —
            // otherwise we'd notify about the existing backlog on mount.
            if (seenCodesRef.current.size > 0 && firstPollDoneRef.current) {
              incoming.push(o.publicCode)
            }
          }
        }
        if (incoming.length > 0) {
          for (const code of incoming) onNewRef.current?.(code)
        }

        const next = data.orders.length
        setNewCount(next)
        onCountChangeRef.current?.(next)
        firstPollDoneRef.current = true
      } catch (err) {
        // Silent on 401 (parent redirects) and transient network errors.
        if (err instanceof ApiError && err.status === 401) return
        // Other errors: just retry on the next tick.
      }
    }

    const firstPollDoneRef = { current: false }

    const scheduleNext = () => {
      if (cancelled) return
      timer = setTimeout(async () => {
        await tick()
        scheduleNext()
      }, intervalMs)
    }

    // Kick off immediately, then schedule.
    void tick().then(scheduleNext)

    // Resume polling immediately when the tab becomes visible again
    // (so the admin sees new orders without waiting for the next tick).
    const onVisibility = () => {
      if (!document.hidden && !cancelled) {
        if (timer) clearTimeout(timer)
        void tick().then(scheduleNext)
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility)
    }

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility)
      }
    }
  }, [intervalMs])

  return newCount
}

/** Convenience: a toast-notification helper to pass as `onNew`. */
export function notifyNewOrder(publicCode: string) {
  toast.success(`سفارش جدید: ${publicCode}`, {
    description: "برای مشاهده به تب «سفارش‌ها» بروید.",
    duration: 8000,
  })
}
