import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { toOrderDTO } from "@/lib/orders"
import type { OrderDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "کد سفارش را وارد کنید.")
    .max(20, "کد سفارش نامعتبر است.")
    // Accept "LF-XXXXX" or just "XXXXX" — normalize to "LF-XXXXX" if the
    // customer typed only the suffix.
    .transform((v) => {
      const upper = v.toUpperCase()
      return upper.startsWith("LF-") ? upper : `LF-${upper}`
    }),
})

/**
 * Public order tracking — looks up an order by its `publicCode` and returns
 * a trimmed DTO (no `customerIp`, no internal `id`). Used by the `/track`
 * page so customers can check their order status without contacting the
 * restaurant.
 *
 * No auth, no CSRF (GET is safe). Rate-limiting is handled at the page level
 * (the input is debounced) — this endpoint is cheap (one indexed lookup).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ code: url.searchParams.get("code") ?? "" })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "کد سفارش نامعتبر است." },
      { status: 400 },
    )
  }

  try {
    const order = await db.order.findUnique({
      where: { publicCode: parsed.data.code },
    })
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "سفارشی با این کد یافت نشد." },
        { status: 404 },
      )
    }
    // Strip the customerIp from the public response — it's admin-only PII.
    const dto = toOrderDTO(order)
    const safe: Omit<OrderDTO, "customerIp"> = {
      id: dto.id,
      publicCode: dto.publicCode,
      status: dto.status,
      customerName: dto.customerName,
      note: dto.note,
      lines: dto.lines,
      total: dto.total,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    }
    return NextResponse.json(
      { order: safe },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("GET /api/orders/track failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت وضعیت سفارش." },
      { status: 500 },
    )
  }
}
