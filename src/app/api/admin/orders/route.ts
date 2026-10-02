import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { toOrderDTO } from "@/lib/orders"
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Optional query params for filtering the admin order list. */
const listQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

/** List orders, newest first — admin only. Optional `?status=NEW` filter. */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const url = new URL(req.url)
  const parsed = listQuerySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "پارامترهای فیلتر نامعتبر است." },
      { status: 400 },
    )
  }

  try {
    const orders = await db.order.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
    })
    return NextResponse.json(
      { orders: orders.map(toOrderDTO) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("GET /api/admin/orders failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت سفارش‌ها." },
      { status: 500 },
    )
  }
}
