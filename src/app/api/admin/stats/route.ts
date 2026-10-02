import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Admin dashboard stats — aggregates order data for the dashboard tab.
 * Returns:
 * - totalRevenue: sum of all DELIVERED order totals (in هزار تومان).
 * - totalOrders: count of all orders.
 * - ordersByStatus: { NEW, SEEN, PREPARING, READY, DELIVERED, CANCELLED } counts.
 * - ordersTodayCount: count of orders created today (Tehran local date).
 * - revenueToday: sum of DELIVERED orders created today.
 * - last7Days: [{ date, orderCount, revenue }] for the last 7 days.
 * - topItems: [{ name, qty, revenue }] — top 5 most-ordered items by qty.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  try {
    const allOrders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
    })

    // --- Aggregations ---

    const totalRevenue = allOrders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.total, 0)

    const totalOrders = allOrders.length

    const ordersByStatus: Record<string, number> = {
      NEW: 0, SEEN: 0, PREPARING: 0, READY: 0, DELIVERED: 0, CANCELLED: 0,
    }
    for (const o of allOrders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1
    }

    // "Today" in Tehran local time — compute the date boundary.
    // Tehran is UTC+3:30. We shift the UTC time by +3:30 to get Tehran
    // wall-clock, then zero out the time to get midnight, then shift back.
    const now = new Date()
    const tehranOffsetMs = 3.5 * 60 * 60 * 1000 // 3 hours 30 minutes
    const tehranNow = new Date(now.getTime() + tehranOffsetMs)
    tehranNow.setUTCHours(0, 0, 0, 0)
    const todayStartMs = tehranNow.getTime() - tehranOffsetMs

    const ordersToday = allOrders.filter((o) => o.createdAt.getTime() >= todayStartMs)
    const revenueToday = ordersToday
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.total, 0)

    // --- Last 7 days breakdown ---
    const last7Days: { date: string; orderCount: number; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStartMs - i * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const dayOrders = allOrders.filter(
        (o) => o.createdAt.getTime() >= dayStart.getTime() && o.createdAt.getTime() < dayEnd.getTime(),
      )
      const dayRevenue = dayOrders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + o.total, 0)
      const mm = String(dayStart.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(dayStart.getUTCDate()).padStart(2, "0")
      last7Days.push({
        date: `${mm}/${dd}`,
        orderCount: dayOrders.length,
        revenue: dayRevenue,
      })
    }

    // --- Top items by quantity ---
    const itemAgg: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const o of allOrders) {
      if (o.status === "CANCELLED") continue
      let lines: { id: string; name: string; price: number; qty: number }[] = []
      try {
        const parsed = JSON.parse(o.linesJson)
        if (Array.isArray(parsed)) {
          lines = parsed.filter(
            (l: unknown): l is { id: string; name: string; price: number; qty: number } =>
              l && typeof l === "object" && typeof (l as Record<string, unknown>).id === "string",
          )
        }
      } catch {
        // Skip corrupt JSON
      }
      for (const line of lines) {
        if (!itemAgg[line.id]) {
          itemAgg[line.id] = { name: line.name, qty: 0, revenue: 0 }
        }
        itemAgg[line.id].qty += line.qty
        itemAgg[line.id].revenue += line.price * line.qty
      }
    }
    const topItems = Object.values(itemAgg)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      ordersByStatus,
      ordersTodayCount: ordersToday.length,
      revenueToday,
      last7Days,
      topItems,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت آمار." },
      { status: 500 },
    )
  }
}
