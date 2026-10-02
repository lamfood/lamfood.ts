"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, MessageCircle, Minus, Package, Plus, ShoppingBasket, Trash2, UtensilsCrossed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api"
import { faNumber, formatPrice } from "@/lib/format"
import { addRecentOrder } from "@/hooks/use-recent-orders"
import { basketCount, basketLineList, basketTotal, useBasketStore } from "@/lib/basket-store"
import type { BasketLine } from "@/lib/basket-store"
import type { PublicOrderResponse, RestaurantConfig } from "@/lib/types"

interface BasketSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: RestaurantConfig
}

function BasketStepper({ line }: { line: BasketLine }) {
  const setQty = useBasketStore((state) => state.setQty)
  return (
    <div className="flex h-9 w-fit items-center gap-0.5 rounded-full bg-primary px-0.5 text-primary-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
        aria-label={`کاهش تعداد ${line.name}`}
        onClick={() => setQty(line.id, line.qty - 1)}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <span className="min-w-5 text-center text-xs font-bold" aria-live="polite">
        {faNumber(line.qty)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
        aria-label={`افزایش تعداد ${line.name}`}
        onClick={() => setQty(line.id, line.qty + 1)}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  )
}

export default function BasketSheet({ open, onOpenChange, config }: BasketSheetProps) {
  const lines = useBasketStore((state) => state.lines)
  const remove = useBasketStore((state) => state.remove)
  const clear = useBasketStore((state) => state.clear)
  const [customerName, setCustomerName] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  /** Last successful order code — shown as a success chip after submit. */
  const [lastOrderCode, setLastOrderCode] = useState<string | null>(null)

  const lineList = basketLineList(lines)
  const count = basketCount(lines)
  const total = basketTotal(lines)

  const scrollToMenu = () => {
    onOpenChange(false)
    window.setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })
    }, 250)
  }

  const handleCheckout = async () => {
    if (submitting) return
    if (lineList.length === 0) {
      toast.error("سبد خرید شما خالی است.")
      return
    }

    setSubmitting(true)
    let publicCode: string | null = null
    try {
      // Persist the order first so the admin sees it in the Orders tab.
      const data = await apiFetch<PublicOrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          lines: lineList.map((l) => ({
            id: l.id,
            name: l.name,
            price: l.price,
            qty: l.qty,
            image: l.image,
            selectedOptions: l.selectedOptions,
          })),
          customerName: customerName.trim(),
          note: note.trim(),
        }),
      })
      publicCode = data.order.publicCode
      setLastOrderCode(publicCode)
      // Persist to localStorage so the customer can re-track this order later
      // from the /track page's "سفارش‌های اخیر" list.
      addRecentOrder({
        code: publicCode,
        createdAt: data.order.createdAt,
        total: data.order.total,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error(err.message)
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "ثبت سفارش ناموفق بود؛ دوباره تلاش کنید.",
        )
      }
      setSubmitting(false)
      return
    }

    // Build the WhatsApp message with the order code so the restaurant can
    // match the customer's message to the persisted order. Include selected
    // options (if any) so the restaurant knows the exact configuration.
    const itemLines = lineList
      .map((line) => {
        const opts = line.selectedOptions && line.selectedOptions.length > 0
          ? ` (${line.selectedOptions.join("، ")})`
          : ""
        return `• ${faNumber(line.qty)}× ${line.name}${opts} — ${formatPrice(line.price * line.qty)}`
      })
      .join("\n")

    const messageParts = [
      `سلام ${config.name} 👋`,
      `کد سفارش: ${publicCode}`,
      "می‌خواهم این سفارش را ثبت کنم:",
      "",
      itemLines,
      "",
      `جمع کل: ${formatPrice(total)}`,
    ]
    if (customerName.trim().length > 0) messageParts.push(`نام: ${customerName.trim()}`)
    if (note.trim().length > 0) messageParts.push(`یادداشت: ${note.trim()}`)

    if (config.whatsapp) {
      const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(messageParts.join("\n"))}`
      window.open(url, "_blank", "noopener,noreferrer")
      toast.success(`سفارش ${publicCode} ثبت شد — در واتساپ ادامه دهید 🎉`)
    } else {
      toast.success(`سفارش ${publicCode} ثبت شد — به‌زودی با شما تماس می‌گیریم 🎉`)
    }

    // Clear the basket + form on successful submit.
    clear()
    setCustomerName("")
    setNote("")
    setSubmitting(false)
  }

  const handleClear = () => {
    clear()
    setCustomerName("")
    setNote("")
    setLastOrderCode(null)
    toast.success("سبد خرید پاک شد")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="nice-scrollbar max-h-[85vh] gap-3 overflow-y-auto rounded-t-2xl"
      >
        {/* Drag-handle look */}
        <div className="mx-auto mt-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />

        <SheetHeader className="px-4 pb-0">
          <SheetTitle className="flex items-center gap-2 text-lg font-extrabold">
            سبد خرید
            {count > 0 && (
              <Badge className="rounded-full px-2.5">{faNumber(count)} آیتم</Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            آیتم‌های انتخاب‌شده، تعداد و مبلغ کل سفارش شما
          </SheetDescription>
        </SheetHeader>

        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <ShoppingBasket className="h-16 w-16 text-muted-foreground/40" aria-hidden />
            <p className="text-lg font-bold">سبد خرید شما خالی است</p>
            <p className="text-sm text-muted-foreground">
              از منو، آیتم‌های دلخواه‌تان را اضافه کنید.
            </p>
            <Button className="mt-1 h-11 rounded-full px-6" onClick={scrollToMenu}>
              مشاهده منو
            </Button>
            <a
              href="/track"
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <Package className="size-4" aria-hidden />
              پیگیری سفارش
            </a>
          </div>
        ) : (
          <>
            <ul className="divide-y px-4">
              {lineList.map((line) => (
                <li key={line.id} className="flex items-center gap-3 py-3">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt={line.name}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <UtensilsCrossed className="h-6 w-6 text-muted-foreground/50" aria-hidden />
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="truncate text-sm font-bold">{line.name}</p>
                    {line.selectedOptions && line.selectedOptions.length > 0 ? (
                      <p className="text-[11px] font-medium text-primary/80">
                        {line.selectedOptions.join("، ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{formatPrice(line.price)}</p>
                    <BasketStepper line={line} />
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-bold">{formatPrice(line.price * line.qty)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`حذف ${line.name} از سبد`}
                      onClick={() => remove(line.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">مجموع سفارش</span>
                <span className="text-lg font-extrabold">{formatPrice(total)}</span>
              </div>

              <Input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="نام شما (اختیاری)"
                aria-label="نام شما (اختیاری)"
                className="h-11"
              />
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="یادداشت سفارش (اختیاری)"
                aria-label="یادداشت سفارش (اختیاری)"
                maxLength={200}
                rows={2}
                className="resize-none"
              />

              <Button
                onClick={handleCheckout}
                disabled={submitting}
                className="h-12 w-full rounded-xl bg-[#25D366] text-base font-bold text-white hover:bg-[#1eb856] disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    در حال ثبت سفارش…
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" aria-hidden />
                    {config.whatsapp ? "ثبت سفارش در واتساپ" : "ثبت سفارش"}
                  </>
                )}
              </Button>

              {lastOrderCode ? (
                <div className="flex flex-col gap-2 rounded-xl bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4" aria-hidden />
                    <span>
                      کد سفارش: <span className="font-extrabold tracking-wider" dir="ltr">{lastOrderCode}</span>
                    </span>
                  </div>
                  <a
                    href={`/track?code=${encodeURIComponent(lastOrderCode)}`}
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
                    aria-label={`پیگیری سفارش ${lastOrderCode}`}
                  >
                    <Package className="size-3.5" aria-hidden />
                    پیگیری وضعیت سفارش
                  </a>
                </div>
              ) : null}

              <Button
                variant="ghost"
                onClick={handleClear}
                className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                پاک کردن سبد
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
