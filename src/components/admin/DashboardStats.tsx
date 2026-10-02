"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, ApiError } from "@/lib/api"
import { faNumber, formatPrice } from "@/lib/format"
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/types"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface StatsData {
  totalRevenue: number
  totalOrders: number
  ordersByStatus: Record<string, number>
  ordersTodayCount: number
  revenueToday: number
  last7Days: { date: string; orderCount: number; revenue: number }[]
  topItems: { name: string; qty: number; revenue: number }[]
}

/* ------------------------------------------------------------------ */
/* Stat card colors                                                    */
/* ------------------------------------------------------------------ */

const STAT_ICON_CLASS = {
  revenue: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  orders: "bg-primary/15 text-primary",
  today: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
} as const

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function DashboardStats({
  onUnauthorized,
}: {
  onUnauthorized: () => void
}) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const data = await apiFetch<StatsData>("/api/admin/stats")
      setStats(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      setLoadFailed(true)
      toast.error(err instanceof Error ? err.message : "خطا در دریافت آمار")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  if (loading) {
    return (
      <div className="grid gap-4" role="status" aria-live="polite">
        <span className="sr-only">در حال بارگذاری آمار…</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (loadFailed || !stats) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">دریافت آمار ناموفق بود.</p>
        <Button variant="outline" onClick={() => void load()} className="h-11">
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const pendingCount =
    (stats.ordersByStatus.NEW ?? 0) +
    (stats.ordersByStatus.SEEN ?? 0) +
    (stats.ordersByStatus.PREPARING ?? 0) +
    (stats.ordersByStatus.READY ?? 0)

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="h-8 px-3 text-sm">
          داشبورد
        </Badge>
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-full"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="به‌روزرسانی آمار"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
        </Button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="درآمد کل"
          value={formatPrice(stats.totalRevenue)}
          icon={Wallet}
          tone="revenue"
        />
        <StatCard
          label="سفارش‌ها"
          value={faNumber(stats.totalOrders)}
          icon={Package}
          tone="orders"
        />
        <StatCard
          label="سفارش امروز"
          value={faNumber(stats.ordersTodayCount)}
          icon={ShoppingBag}
          tone="today"
        />
        <StatCard
          label="در انتظار"
          value={faNumber(pendingCount)}
          icon={TrendingUp}
          tone="pending"
        />
      </div>

      {/* 7-day chart */}
      <Card className="gap-3 rounded-2xl py-4">
        <CardContent className="grid gap-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-muted-foreground">سفارش‌های ۷ روز اخیر</h3>
          </div>
          <MiniBarChart data={stats.last7Days} />
        </CardContent>
      </Card>

      {/* Status breakdown + top items */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card className="gap-3 rounded-2xl py-4">
          <CardContent className="grid gap-3 px-4">
            <h3 className="text-sm font-bold text-muted-foreground">وضعیت سفارش‌ها</h3>
            <div className="grid gap-2">
              {(Object.keys(stats.ordersByStatus) as OrderStatus[]).map((status) => {
                const count = stats.ordersByStatus[status] ?? 0
                const meta = ORDER_STATUS_META[status]
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="text-sm font-extrabold">{faNumber(count)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top items */}
        <Card className="gap-3 rounded-2xl py-4">
          <CardContent className="grid gap-3 px-4">
            <h3 className="text-sm font-bold text-muted-foreground">پرفروش‌ترین آیتم‌ها</h3>
            {stats.topItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز سفارشی ثبت نشده است.
              </p>
            ) : (
              <div className="grid gap-2">
                {stats.topItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {faNumber(i + 1)}
                      </span>
                      <span className="truncate text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {faNumber(item.qty)} عدد
                      </span>
                      <span className="font-bold">{formatPrice(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tone: keyof typeof STAT_ICON_CLASS
}) {
  return (
    <Card className="gap-2 rounded-2xl py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${STAT_ICON_CLASS[tone]}`}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-extrabold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Mini bar chart (CSS-only, no chart library)                        */
/* ------------------------------------------------------------------ */

function MiniBarChart({
  data,
}: {
  data: { date: string; orderCount: number; revenue: number }[]
}) {
  const maxOrders = Math.max(...data.map((d) => d.orderCount), 1)
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          {/* Orders bar */}
          <div className="flex h-32 w-full items-end justify-center">
            <div
              className="w-full max-w-[2rem] rounded-t-lg bg-primary/70 transition-all hover:bg-primary"
              style={{ height: `${Math.max((day.orderCount / maxOrders) * 100, 4)}%` }}
              title={`${faNumber(day.orderCount)} سفارش`}
            />
          </div>
          {/* Count */}
          <span className="text-[10px] font-bold text-primary">
            {faNumber(day.orderCount)}
          </span>
          {/* Date */}
          <span className="text-[9px] text-muted-foreground" dir="ltr">
            {day.date}
          </span>
        </div>
      ))}
    </div>
  )
}

// Suppress unused warning
void Loader2
