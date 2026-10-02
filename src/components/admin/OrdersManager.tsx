"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  Clock,
  Filter,
  Loader2,
  Package,
  RefreshCcw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch, ApiError } from "@/lib/api"
import { faNumber, formatPrice } from "@/lib/format"
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  type OrderDTO,
  type OrderListResponse,
  type OrderStatus,
} from "@/lib/types"

/* ------------------------------------------------------------------ */
/* Status badge (color-coded by tone)                                  */
/* ------------------------------------------------------------------ */

const TONE_CLASSES: Record<
  "new" | "info" | "warn" | "good" | "done" | "bad",
  string
> = {
  new: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300",
  info: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30 dark:text-sky-300",
  warn: "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/30 dark:text-orange-300",
  good: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300",
  done: "bg-primary/15 text-primary ring-1 ring-primary/30",
  bad: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
}

/** Solid stripe color for the order card's right edge (status accent). */
const TONE_STRIPE: Record<"new" | "info" | "warn" | "good" | "done" | "bad", string> = {
  new: "bg-amber-500",
  info: "bg-sky-500",
  warn: "bg-orange-500",
  good: "bg-emerald-500",
  done: "bg-primary",
  bad: "bg-destructive",
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status]
  return (
    <Badge className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[meta.tone]}`}>
      {meta.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Format an ISO string as a short Persian date+time (e.g. «۱۴۰۳/۰۷/۱۱ ۱۴:۳۲»). */
function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  } catch {
    return iso
  }
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function OrdersManager({
  onUnauthorized,
}: {
  onUnauthorized: () => void
}) {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null)
  const [loadFailed, setLoadFailed] = useState<boolean>(false)
  const [search, setSearch] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL")

  const [selected, setSelected] = useState<OrderDTO | null>(null)
  const [detailOpen, setDetailOpen] = useState<boolean>(false)
  const [updatingStatus, setUpdatingStatus] = useState<OrderStatus | null>(null)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const data = await apiFetch<OrderListResponse>("/api/admin/orders")
      setOrders(data.orders)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      setLoadFailed(true)
      setOrders((prev) => (prev === null ? [] : prev))
      toast.error(err instanceof Error ? err.message : "خطا در دریافت سفارش‌ها")
    }
  }, [onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  const query = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (orders === null) return []
    let list = orders
    if (statusFilter !== "ALL") {
      list = list.filter((o) => o.status === statusFilter)
    }
    if (query.length > 0) {
      list = list.filter(
        (o) =>
          o.publicCode.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.note.toLowerCase().includes(query) ||
          o.lines.some((l) => l.name.toLowerCase().includes(query)),
      )
    }
    return list
  }, [orders, statusFilter, query])

  // Derived stats for the top-of-list cards.
  const stats = useMemo(() => {
    if (orders === null) return null
    const by = (s: OrderStatus) => orders.filter((o) => o.status === s).length
    return {
      total: orders.length,
      new: by("NEW"),
      preparing: by("PREPARING"),
      ready: by("READY"),
    }
  }, [orders])

  async function changeStatus(order: OrderDTO, next: OrderStatus) {
    if (updatingStatus) return
    setUpdatingStatus(next)
    try {
      const data = await apiFetch<{ order: OrderDTO }>(
        `/api/admin/orders/${order.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: next }),
        },
      )
      setOrders((prev) =>
        prev ? prev.map((o) => (o.id === data.order.id ? data.order : o)) : prev,
      )
      setSelected((prev) => (prev && prev.id === data.order.id ? data.order : prev))
      toast.success(`وضعیت سفارش ${data.order.publicCode} به‌روز شد`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "به‌روزرسانی ناموفق بود")
    } finally {
      setUpdatingStatus(null)
    }
  }

  function openDetail(order: OrderDTO) {
    setSelected(order)
    setDetailOpen(true)
    // Auto-mark NEW → SEEN on first open (best-effort; ignore errors).
    if (order.status === "NEW") {
      void changeStatus(order, "SEEN")
    }
  }

  // Loading skeleton
  if (orders === null) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">در حال بارگذاری سفارش‌ها…</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {/* Stats cards */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="کل سفارش‌ها" value={stats.total} icon={Package} tone="done" />
          <StatCard label="جدید" value={stats.new} icon={Clock} tone="new" />
          <StatCard label="در حال آماده‌سازی" value={stats.preparing} icon={ShoppingBag} tone="warn" />
          <StatCard label="آماده تحویل" value={stats.ready} icon={Package} tone="good" />
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Badge variant="secondary" className="h-8 shrink-0 px-3 text-sm">
            {faNumber(filtered.length)} سفارش
          </Badge>
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو (کد / نام / آیتم)…"
              aria-label="جستجوی سفارش"
              className="h-11 pr-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as OrderStatus | "ALL")}
          >
            <SelectTrigger id="order-status-filter" className="h-11 w-[180px] gap-2" aria-label="فیلتر وضعیت">
              <Filter className="size-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()} className="h-11" aria-label="بارگذاری مجدد">
            <RefreshCcw className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Load failure retry */}
      {loadFailed ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">دریافت سفارش‌ها ناموفق بود.</p>
          <Button variant="outline" onClick={() => void load()} className="h-11">
            تلاش مجدد
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-14 text-center">
          <ShoppingBag className="size-16 text-muted-foreground/40" aria-hidden />
          <p className="font-medium text-muted-foreground">
            {query || statusFilter !== "ALL"
              ? "سفارشی با این فیلتر پیدا نشد."
              : "هنوز سفارشی ثبت نشده است"}
          </p>
          {!query && statusFilter === "ALL" ? (
            <p className="max-w-sm text-sm text-muted-foreground">
              وقتی مشتریان از منو سفارش می‌دهند، سفارش‌ها اینجا نمایش داده می‌شوند.
            </p>
          ) : null}
        </div>
      ) : (
        /* Orders list */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpen={() => openDetail(order)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <OrderDetailDialog
        order={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        updatingStatus={updatingStatus}
        onChangeStatus={changeStatus}
      />
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
  value: number
  icon: typeof Clock
  tone: "new" | "info" | "warn" | "good" | "done" | "bad"
}) {
  return (
    <Card className="gap-2 rounded-2xl py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-extrabold leading-tight">{faNumber(value)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Order card (in the grid)                                            */
/* ------------------------------------------------------------------ */

function OrderCard({
  order,
  onOpen,
}: {
  order: OrderDTO
  onOpen: () => void
}) {
  const itemCount = order.lines.reduce((sum, l) => sum + l.qty, 0)
  return (
    <Card className="group relative gap-3 overflow-hidden rounded-2xl py-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Left status accent stripe (color-coded by current status tone) */}
      <span
        aria-hidden
        className={`absolute inset-y-0 right-0 w-1.5 ${TONE_STRIPE[ORDER_STATUS_META[order.status].tone]}`}
      />
      <CardContent className="grid gap-3 px-4">
        {/* Header: code + status + time */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-extrabold tracking-wider" dir="ltr">
              {order.publicCode}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Customer + line preview */}
        <div className="flex flex-col gap-1 text-sm">
          {order.customerName ? (
            <p className="truncate font-medium">{order.customerName}</p>
          ) : (
            <p className="truncate text-muted-foreground">مشتری بدون نام</p>
          )}
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {order.lines.map((l) => `${l.name} (${faNumber(l.qty)})`).join("، ")}
          </p>
        </div>

        {/* Footer: total (prominent) + count + view button */}
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">مجموع</span>
            <span className="text-base font-extrabold text-foreground">
              {formatPrice(order.total)}
            </span>
          </div>
          <Badge variant="secondary" className="px-2 py-0 text-[10px]">
            {faNumber(itemCount)} آیتم
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpen}
            className="h-9 gap-1 px-3 text-xs font-medium text-primary hover:bg-primary/10"
            aria-label={`مشاهدهٔ جزئیات سفارش ${order.publicCode}`}
          >
            مشاهده
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Order detail dialog                                                 */
/* ------------------------------------------------------------------ */

function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  updatingStatus,
  onChangeStatus,
}: {
  order: OrderDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  updatingStatus: OrderStatus | null
  onChangeStatus: (order: OrderDTO, next: OrderStatus) => void
}) {
  // The dialog content is rendered only when there's an order to show.
  if (!order) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="hidden" aria-hidden>
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">جزئیات سفارش</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              در حال بارگذاری…
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        key={order.id}
        className="nice-scrollbar max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl"
      >
        <AlertDialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <span className="font-mono tracking-wider" dir="ltr">{order.publicCode}</span>
                <StatusBadge status={order.status} />
              </AlertDialogTitle>
              <AlertDialogDescription>
                {formatDateTime(order.createdAt)}
                {order.customerName ? ` • ${order.customerName}` : ""}
              </AlertDialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="بستن"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </AlertDialogHeader>

        {/* Lines */}
        <div className="mt-2 grid gap-2">
          <h4 className="text-sm font-bold text-muted-foreground">آیتم‌های سفارش</h4>
          <ul className="divide-y rounded-2xl border">
            {order.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 p-3">
                {line.image ? (
                  <img
                    src={line.image}
                    alt={line.name}
                    loading="lazy"
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <ShoppingBag className="size-5 text-muted-foreground/50" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{line.name}</p>
                  {line.selectedOptions && line.selectedOptions.length > 0 ? (
                    <p className="text-[11px] font-medium text-primary/80">
                      {line.selectedOptions.join("، ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(line.price)} × {faNumber(line.qty)}
                  </p>
                </div>
                <span className="text-sm font-extrabold">
                  {formatPrice(line.price * line.qty)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Note */}
        {order.note ? (
          <div className="mt-3 grid gap-1">
            <h4 className="text-sm font-bold text-muted-foreground">یادداشت مشتری</h4>
            <p className="rounded-xl bg-muted/60 p-3 text-sm leading-6">{order.note}</p>
          </div>
        ) : null}

        {/* Total */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">مجموع سفارش</span>
          <span className="text-lg font-extrabold">{formatPrice(order.total)}</span>
        </div>

        {/* Status changer */}
        <div className="mt-4 grid gap-2">
          <h4 className="text-sm font-bold text-muted-foreground">تغییر وضعیت</h4>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => {
              const isActive = order.status === s
              const isLoading = updatingStatus === s
              const meta = ORDER_STATUS_META[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => !isActive && !updatingStatus && onChangeStatus(order, s)}
                  disabled={isActive || !!updatingStatus}
                  aria-pressed={isActive}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all disabled:cursor-not-allowed ${
                    isActive
                      ? TONE_CLASSES[meta.tone]
                      : "bg-muted text-foreground ring-1 ring-transparent hover:bg-secondary hover:ring-border disabled:opacity-50"
                  }`}
                >
                  {isLoading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>بستن</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
