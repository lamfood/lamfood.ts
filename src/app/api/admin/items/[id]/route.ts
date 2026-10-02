import { NextRequest, NextResponse } from "next/server"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { menuItemToDTO } from "@/lib/menu-items"
import { itemCreateSchema } from "../route"

type RouteContext = { params: Promise<{ id: string }> }

/** Update an item — admin only. */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = itemCreateSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "اطلاعات نامعتبر است." },
      { status: 400 },
    )
  }

  // Serialize the options array to JSON for storage (SQLite has no array type).
  const { options, ...rest } = parsed.data
  const optionsJson = JSON.stringify(options)

  try {
    const existing = await db.menuItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "آیتم مورد نظر یافت نشد." },
        { status: 404 },
      )
    }
    const item = await db.menuItem.update({
      where: { id },
      data: { ...rest, optionsJson },
    })
    return NextResponse.json({ item: menuItemToDTO(item) })
  } catch (err) {
    console.error("PUT /api/admin/items/[id] failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در ویرایش آیتم؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}

/** Delete an item — admin only. */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const { id } = await ctx.params
  try {
    const existing = await db.menuItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "آیتم مورد نظر یافت نشد." },
        { status: 404 },
      )
    }
    await db.menuItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE /api/admin/items/[id] failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در حذف آیتم؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}
