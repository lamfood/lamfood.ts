import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, getClientIp } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const viewSchema = z.object({
  itemId: z.string().min(1).max(100),
})

/** Per-IP rate limit for view increments — prevents abuse from a single
 *  client spamming the endpoint to inflate view counts. Sliding window,
 *  in-memory, 20 views / 5 min per IP. */
const VIEW_RATE_LIMIT = 20
const VIEW_RATE_WINDOW_MS = 5 * 60 * 1000
const ipViewTimes = new Map<string, number[]>()

/**
 * Public endpoint to increment an item's `viewCount` when the customer
 * opens the ItemDetailsDialog. This powers the "محبوب‌ترین" (most popular)
 * sort option + flame badges on popular items.
 *
 * CSRF-guarded (assertSameOrigin) + per-IP rate-limited. The increment is
 * fire-and-forget from the client's perspective — errors are swallowed so
 * a failed view-tracking call never blocks the dialog from opening.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => null)
  const parsed = viewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "آیتم نامعتبر است." },
      { status: 400 },
    )
  }

  const ip = getClientIp(req)
  const now = Date.now()
  const cutoff = now - VIEW_RATE_WINDOW_MS
  const times = (ipViewTimes.get(ip) ?? []).filter((t) => t > cutoff)
  if (times.length >= VIEW_RATE_LIMIT) {
    ipViewTimes.set(ip, times)
    return NextResponse.json(
      { error: "rate_limited", message: "تعداد درخواست‌ها بیش از حد مجاز است." },
      { status: 429 },
    )
  }
  times.push(now)
  ipViewTimes.set(ip, times)

  try {
    // Fire-and-forget increment — if the item doesn't exist, silently ignore.
    await db.menuItem.updateMany({
      where: { id: parsed.data.itemId },
      data: { viewCount: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/menu/view failed:", err)
    // Return 200 even on error so the client doesn't show an error toast —
    // view tracking is non-critical and shouldn't block the UX.
    return NextResponse.json({ ok: true })
  }
}
