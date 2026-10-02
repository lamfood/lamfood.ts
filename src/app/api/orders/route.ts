import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, getClientIp } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUniqueOrderCode, toOrderDTO } from "@/lib/orders"
import type { OrderLineDTO } from "@/lib/types"

/** Max lines / units per order — cheap abuse guard. */
const MAX_LINES = 50
const MAX_QTY_PER_LINE = 99

const orderLineSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(100_000),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  image: z.string().nullable().optional(),
})

const createOrderSchema = z.object({
  lines: z.array(orderLineSchema).min(1, "سبد خرید خالی است").max(MAX_LINES),
  customerName: z.string().trim().max(120).default(""),
  note: z.string().trim().max(500).default(""),
})

export const dynamic = "force-dynamic"

/**
 * Public order submission. Creates a persisted Order row from the customer's
 * basket, returns a friendly publicCode (e.g. "LF-7K3X9"), and lets the
 * client open WhatsApp with the prefilled message (the client does the
 * wa.me redirect; the server just records the order).
 *
 * CSRF: assertSameOrigin guards against cross-site form submissions.
 * Rate-limiting: a sliding-window per-IP cap of 10 orders / 10 minutes is
 * enforced in-memory (good enough for a single-instance deployment).
 */
const ORDER_RATE_LIMIT = 10
const ORDER_RATE_WINDOW_MS = 10 * 60 * 1000
const ipOrderTimes = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - ORDER_RATE_WINDOW_MS
  const times = (ipOrderTimes.get(ip) ?? []).filter((t) => t > cutoff)
  if (times.length >= ORDER_RATE_LIMIT) {
    ipOrderTimes.set(ip, times)
    return true
  }
  times.push(now)
  ipOrderTimes.set(ip, times)
  return false
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "اطلاعات نامعتبر است." },
      { status: 400 },
    )
  }

  const ip = getClientIp(req)
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "تعداد سفارش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." },
      { status: 429 },
    )
  }

  // Snapshot the basket lines into the order. We trust the client's name/qty
  // (the admin can see the snapshot and confirm with the customer via WhatsApp)
  // but re-derive the total server-side so a tampered price can't be persisted.
  const lines: OrderLineDTO[] = parsed.data.lines.map((l) => ({
    id: l.id,
    name: l.name,
    price: l.price,
    qty: l.qty,
    image: l.image ?? null,
  }))
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0)

  if (total > 10_000_000) {
    return NextResponse.json(
      { error: "validation_error", message: "مبلغ سفارش بیش از حد مجاز است." },
      { status: 400 },
    )
  }

  try {
    const publicCode = await generateUniqueOrderCode()
    const order = await db.order.create({
      data: {
        publicCode,
        customerName: parsed.data.customerName,
        note: parsed.data.note,
        linesJson: JSON.stringify(lines),
        total,
        customerIp: ip,
      },
    })
    const dto = toOrderDTO(order)
    // Public response: only the fields the customer needs (no IP, no admin status flags).
    return NextResponse.json(
      {
        order: {
          publicCode: dto.publicCode,
          status: dto.status,
          total: dto.total,
          createdAt: dto.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("POST /api/orders failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "ثبت سفارش ناموفق بود؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}
