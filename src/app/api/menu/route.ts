import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { menuItemToDTO } from "@/lib/menu-items"

export const dynamic = "force-dynamic"

/** Public menu — only available items, ordered. */
export async function GET() {
  try {
    const rows = await db.menuItem.findMany({
      where: { available: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })
    const items = rows.map(menuItemToDTO)
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("GET /api/menu failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت منو؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}
