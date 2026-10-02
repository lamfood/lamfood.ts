import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { toOrderDTO } from "@/lib/orders"
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types"

type RouteContext = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
})

/** Get a single order by its internal id (admin only). */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const { id } = await ctx.params
  try {
    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "سفارش یافت نشد." },
        { status: 404 },
      )
    }
    return NextResponse.json({ order: toOrderDTO(order) })
  } catch (err) {
    console.error("GET /api/admin/orders/[id] failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت سفارش." },
      { status: 500 },
    )
  }
}

/** Update an order's status (admin only). */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "وضعیت نامعتبر است." },
      { status: 400 },
    )
  }

  try {
    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "سفارش یافت نشد." },
        { status: 404 },
      )
    }
    const order = await db.order.update({
      where: { id },
      data: { status: parsed.data.status as OrderStatus },
    })
    return NextResponse.json({ order: toOrderDTO(order) })
  } catch (err) {
    console.error("PUT /api/admin/orders/[id] failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "به‌روزرسانی سفارش ناموفق بود." },
      { status: 500 },
    )
  }
}
