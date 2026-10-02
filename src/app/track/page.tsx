"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingCart,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiError, apiFetch } from "@/lib/api"
import { faNumber, formatPrice } from "@/lib/format"
import { useRecentOrders } from "@/hooks/use-recent-orders"
import {
  ORDER_STATUS_META,
  type OrderDTO,
  type OrderStatus,
} from "@/lib/types"

/* ------------------------------------------------------------------ */
/* Status timeline                                                     */
/* ------------------------------------------------------------------ */

interface TimelineStep {
  status: OrderStatus
  icon: LucideIcon
  /** Persian label (uses the shared ORDER_STATUS_META). */
  label: string
}

/** Ordered lifecycle steps for the timeline UI. CANCELLED is shown as a
 *  separate terminal state (not a step in the timeline). */
const TIMELINE_STEPS: TimelineStep[] = [
  { status: "NEW", icon: Package, label: ORDER_STATUS_META.NEW.label },
  { status: "SEEN", icon: Clock, label: ORDER_STATUS_META.SEEN.label },
  { status: "PREPARING", icon: ChefHat, label: ORDER_STATUS_META.PREPARING.label },
  { status: "READY", icon: PackageCheck, label: ORDER_STATUS_META.READY.label },
  { status: "DELIVERED", icon: CheckCircle2, label: ORDER_STATUS_META.DELIVERED.label },
]

/** Find the index of the current status in the timeline. Returns -1 for
 *  CANCELLED (terminal) so the timeline renders fully greyed-out. */
function stepIndex(status: OrderStatus): number {
  if (status === "CANCELLED") return -1
  return TIMELINE_STEPS.findIndex((s) => s.status === status)
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

/** Format a Date as a Persian time-only string (e.g. «۱۴:۳۲»). */
function formatTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d)
  } catch {
    return d.toLocaleTimeString()
  }
}

const TONE_CLASSES: Record<string, string> = {
  new: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300",
  info: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30 dark:text-sky-300",
  warn: "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/30 dark:text-orange-300",
  good: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300",
  done: "bg-primary/15 text-primary ring-1 ring-primary/30",
  bad: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "found"; order: Omit<OrderDTO, "customerIp"> }

export default function TrackOrderPage() {
  const searchParams = useSearchParams()
  const initialCode = (searchParams.get("code") ?? "").trim().toUpperCase()

  const [code, setCode] = useState(initialCode)
  const [view, setView] = useState<ViewState>(
    initialCode ? { kind: "loading" } : { kind: "idle" },
  )
  /** "Last updated" timestamp — shown as a subtle hint + drives the refresh
   *  button's spin animation. */
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  /** True when a silent background refresh is in flight (no loading state,
   *  just the refresh button spins). */
  const [refreshing, setRefreshing] = useState(false)
  /** Track whether the order has reached a terminal state — we stop polling
   *  once it's DELIVERED or CANCELLED (no point refreshing a finished order). */
  const isTerminal =
    view.kind === "found" &&
    (view.order.status === "DELIVERED" || view.order.status === "CANCELLED")

  const lookup = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      setView({ kind: "idle" })
      return
    }
    setView({ kind: "loading" })
    try {
      const data = await apiFetch<{ order: Omit<OrderDTO, "customerIp"> }>(
        `/api/orders/track?code=${encodeURIComponent(trimmed)}`,
      )
      setView({ kind: "found", order: data.order })
      setLastUpdated(new Date())
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setView({ kind: "not_found" })
          return
        }
        if (err.status === 400) {
          setView({ kind: "error", message: err.message })
          return
        }
      }
      setView({
        kind: "error",
        message: err instanceof Error ? err.message : "خطای غیرمنتظره‌ای رخ داد.",
      })
    }
  }, [])

  /** Silent refresh — re-fetches the current order without flipping to the
   *  loading state. Used by the auto-poll and the manual refresh button. */
  const refresh = useCallback(async () => {
    // Only refresh if we currently have a found order with a code.
    if (view.kind !== "found") return
    setRefreshing(true)
    try {
      const data = await apiFetch<{ order: Omit<OrderDTO, "customerIp"> }>(
        `/api/orders/track?code=${encodeURIComponent(view.order.publicCode)}`,
      )
      setView({ kind: "found", order: data.order })
      setLastUpdated(new Date())
    } catch {
      // Silent on refresh errors — keep the last-known state. The next
      // poll will try again.
    } finally {
      setRefreshing(false)
    }
  }, [view])

  // On first mount, if the URL has ?code=LF-XXXXX, run the lookup immediately.
  // We use a ref flag so this only runs once (not on every re-render), and
  // we call `lookup` inside a microtask so setState happens outside the
  // effect's synchronous body (keeps the `react-hooks/set-state-in-effect`
  // lint rule happy).
  const didInitialLookupRef = useRef(false)
  useEffect(() => {
    if (didInitialLookupRef.current) return
    if (initialCode.length === 0) return
    didInitialLookupRef.current = true
    // Defer to a microtask so we're not calling setState synchronously in
    // the effect body.
    queueMicrotask(() => void lookup(initialCode))
  }, [initialCode, lookup])

  // Auto-poll every 30s once we have a found order, UNLESS the order is in
  // a terminal state (DELIVERED / CANCELLED) — no point refreshing a finished
  // order. Skips when the tab is hidden (Page Visibility API) to save
  // requests; resumes immediately when visible.
  useEffect(() => {
    if (view.kind !== "found" || isTerminal) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      if (cancelled) return
      timer = setTimeout(async () => {
        if (typeof document !== "undefined" && document.hidden) {
          // Tab hidden — skip this tick, schedule the next.
          scheduleNext()
          return
        }
        try {
          const data = await apiFetch<{ order: Omit<OrderDTO, "customerIp"> }>(
            `/api/orders/track?code=${encodeURIComponent(view.order.publicCode)}`,
          )
          if (!cancelled) {
            setView({ kind: "found", order: data.order })
            setLastUpdated(new Date())
          }
        } catch {
          // Silent — keep last-known state.
        }
        scheduleNext()
      }, 30_000)
    }

    const onVisibility = () => {
      if (!document.hidden && !cancelled) {
        if (timer) clearTimeout(timer)
        // Refresh immediately when the tab becomes visible again.
        void refresh().then(scheduleNext)
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility)
    }

    scheduleNext()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility)
      }
    }
  }, [view, isTerminal, refresh])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void lookup(code)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky top bar — back to menu + page title */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="size-10 rounded-full" aria-label="بازگشت به منو">
              <Link href="/">
                <X className="size-5" aria-hidden />
              </Link>
            </Button>
            <h1 className="text-base font-extrabold sm:text-lg">پیگیری سفارش</h1>
          </div>
          <Button asChild variant="ghost" className="h-10 gap-1 text-sm">
            <Link href="/">
              <ArrowRight className="size-4" aria-hidden />
              <span className="hidden sm:inline">بازگشت به منو</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {/* Search form */}
        <Card className="gap-4 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Search className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">کد سفارش خود را وارد کنید</h2>
              <p className="text-sm text-muted-foreground">
                کد سفارش (مثل <span className="font-mono font-bold" dir="ltr">LF-7K3X9</span>) را در زمان ثبت سفارش دریافت کرده‌اید.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <label htmlFor="track-code" className="text-sm font-medium">
                کد سفارش
              </label>
              <Input
                id="track-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LF-XXXXX"
                dir="ltr"
                className="h-12 text-left font-mono text-base font-bold uppercase tracking-wider"
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
              />
            </div>
            <Button
              type="submit"
              className="h-12 gap-2 rounded-xl px-6 text-base font-bold sm:w-auto"
              disabled={view.kind === "loading" || code.trim().length === 0}
            >
              {view.kind === "loading" ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  در حال جستجو…
                </>
              ) : (
                <>
                  <Search className="size-5" aria-hidden />
                  پیگیری
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Result */}
        <div className="mt-4">
          {view.kind === "idle" ? (
            <IdleHint onPickCode={(c) => void lookup(c)} />
          ) : view.kind === "loading" ? (
            <LoadingState />
          ) : view.kind === "not_found" ? (
            <NotFoundState code={code} onRetry={() => setCode("")} />
          ) : view.kind === "error" ? (
            <ErrorState message={view.message} />
          ) : (
            <OrderResult
              order={view.order}
              refreshing={refreshing}
              lastUpdated={lastUpdated}
              isTerminal={isTerminal}
              onRefresh={() => void refresh()}
            />
          )}
        </div>
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          © {faNumber(new Date().getFullYear())} لم‌فود — پیگیری سفارش
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-views                                                           */
/* ------------------------------------------------------------------ */

function IdleHint({ onPickCode }: { onPickCode: (code: string) => void }) {
  const recentOrders = useRecentOrders()

  return (
    <div className="grid gap-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <Package className="size-12 text-muted-foreground/40" aria-hidden />
        <p className="font-medium text-muted-foreground">
          برای پیگیری سفارش، کد آن را در بالا وارد کنید.
        </p>
      </div>

      {/* Recent orders (localStorage-backed) — shown when the customer has
          submitted orders before on this device. */}
      {recentOrders.length > 0 ? (
        <Card className="gap-3 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              سفارش‌های اخیر شما
            </h3>
            <span className="text-xs text-muted-foreground">
              {faNumber(recentOrders.length)} سفارش
            </span>
          </div>
          <ul className="grid gap-2">
            {recentOrders.map((o) => (
              <li key={o.code}>
                <button
                  type="button"
                  onClick={() => onPickCode(o.code)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-right transition-colors hover:border-primary/40 hover:bg-primary/5"
                  aria-label={`پیگیری سفارش ${o.code}`}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-sm font-bold tracking-wider" dir="ltr">
                      {o.code}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPrice(o.total)}</span>
                    <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-center text-[11px] text-muted-foreground">
            این لیست فقط روی این دستگاه ذخیره شده است.
          </p>
        </Card>
      ) : null}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border p-8 text-center" aria-live="polite">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">در حال جستجوی سفارش…</p>
    </div>
  )
}

function NotFoundState({ code, onRetry }: { code: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <TriangleAlert className="size-8 text-destructive" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-bold">سفارشی یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">
          سفاری با کد <span className="font-mono font-bold" dir="ltr">{code}</span> پیدا نشد.
          <br />
          کد را بررسی کنید و دوباره امتحان کنید.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry} className="h-11 rounded-full px-6">
        پاک کردن و تلاش مجدد
      </Button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/40 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <TriangleAlert className="size-8 text-destructive" aria-hidden />
      </div>
      <p className="text-lg font-bold">خطا</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function OrderResult({
  order,
  refreshing,
  lastUpdated,
  isTerminal,
  onRefresh,
}: {
  order: Omit<OrderDTO, "customerIp">
  refreshing: boolean
  lastUpdated: Date | null
  isTerminal: boolean
  onRefresh: () => void
}) {
  const meta = ORDER_STATUS_META[order.status]
  const currentStep = stepIndex(order.status)
  const isCancelled = order.status === "CANCELLED"

  return (
    <div className="grid gap-4">
      {/* Header card: code + status + time + refresh */}
      <Card className="gap-3 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">کد سفارش</p>
            <p className="font-mono text-2xl font-extrabold tracking-wider" dir="ltr">
              {order.publicCode}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ثبت در {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${TONE_CLASSES[meta.tone]}`}
            >
              {meta.label}
            </span>
            {/* Manual refresh button — spins while refreshing. */}
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="به‌روزرسانی وضعیت"
              title="به‌روزرسانی وضعیت"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
            </Button>
          </div>
        </div>
        {/* Last-updated hint + auto-poll status */}
        <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {isTerminal ? (
              <>
                <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                سفارش نهایی شده — به‌روزرسانی متوقف شد
              </>
            ) : (
              <>
                <span className="relative flex size-1.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                هر ۳۰ ثانیه به‌روزرسانی خودکار
              </>
            )}
          </span>
          {lastUpdated ? (
            <span>
              آخرین به‌روزرسانی: {formatTime(lastUpdated)}
            </span>
          ) : null}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="gap-4 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-muted-foreground">مراحل سفارش</h3>
        {isCancelled ? (
          <CancelledNotice updatedAt={order.updatedAt} />
        ) : (
          <Timeline currentStep={currentStep} />
        )}
      </Card>

      {/* Order items */}
      <Card className="gap-3 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <ShoppingCart className="size-4" aria-hidden />
            آیتم‌های سفارش
          </h3>
          <span className="text-xs text-muted-foreground">
            {faNumber(order.lines.reduce((sum, l) => sum + l.qty, 0))} آیتم
          </span>
        </div>
        <ul className="divide-y">
          {order.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-3">
              {line.image ? (
                <img
                  src={line.image}
                  alt={line.name}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <ShoppingCart className="size-5 text-muted-foreground/50" aria-hidden />
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
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-muted-foreground">مجموع سفارش</span>
          <span className="text-lg font-extrabold">{formatPrice(order.total)}</span>
        </div>
      </Card>

      {/* Customer note (if any) */}
      {order.note ? (
        <Card className="gap-2 rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-bold text-muted-foreground">یادداشت شما</h3>
          <p className="rounded-xl bg-muted/60 p-3 text-sm leading-6">{order.note}</p>
        </Card>
      ) : null}

      {/* Need help? */}
      <p className="text-center text-xs text-muted-foreground">
        اگر سوالی درباره سفارش دارید، با رستوران تماس بگیرید.
      </p>
    </div>
  )
}

function Timeline({ currentStep }: { currentStep: number }) {
  return (
    <ol className="relative grid gap-4">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < currentStep
        const isCurrent = i === currentStep
        const isFuture = i > currentStep
        const Icon = step.icon
        return (
          <li key={step.status} className="relative flex items-start gap-3">
            {/* Connector line */}
            {i < TIMELINE_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={`absolute right-[18px] top-9 h-[calc(100%-16px)] w-0.5 ${
                  isDone ? "bg-primary" : "bg-border"
                }`}
              />
            ) : null}
            {/* Icon circle */}
            <div
              className={`relative flex size-9 shrink-0 items-center justify-center rounded-full ring-2 transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground ring-primary"
                  : isCurrent
                    ? "bg-accent text-accent-foreground ring-accent"
                    : "bg-muted text-muted-foreground ring-border"
              }`}
            >
              <Icon className="size-4" aria-hidden />
            </div>
            {/* Label */}
            <div className="flex flex-1 flex-col pt-1">
              <p
                className={`text-sm font-bold ${
                  isFuture ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {step.label}
              </p>
              {isCurrent ? (
                <p className="text-xs text-accent-foreground/80">مرحله فعلی</p>
              ) : isDone ? (
                <p className="text-xs text-muted-foreground">انجام شد</p>
              ) : (
                <p className="text-xs text-muted-foreground/60">در انتظار</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function CancelledNotice({ updatedAt }: { updatedAt: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-destructive/5 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <XCircle className="size-5" aria-hidden />
      </div>
      <div className="flex-1">
        <p className="font-bold text-destructive">سفارش لغو شد</p>
        <p className="mt-1 text-xs text-muted-foreground">
          این سفارش در {formatDateTime(updatedAt)} لغو شده است.
          <br />
          برای اطلاعات بیشتر با رستوران تماس بگیرید.
        </p>
      </div>
    </div>
  )
}
