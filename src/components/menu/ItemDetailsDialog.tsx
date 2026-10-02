"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBasket, UtensilsCrossed, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { categoryLabel } from "@/lib/categories"
import { faNumber, formatPrice } from "@/lib/format"
import { useBasketStore } from "@/lib/basket-store"
import type { MenuItemDTO } from "@/lib/types"

interface ItemDetailsDialogProps {
  item: MenuItemDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Full-screen-friendly details dialog for a single MenuItemDTO. Shows a large
 * preview image, full description (no line-clamp), category badge, price,
 * and an inline add-to-basket stepper. Closes on Escape, backdrop click, or
 * the X button. Keyboard-accessible: Tab cycles through actions, Enter on the
 * primary button adds to basket.
 *
 * The dialog is intentionally rendered with the `<Dialog>` primitive from
 * shadcn/ui (Radix UI) for proper focus trapping, scroll lock, and a11y.
 *
 * The `key={item.id}` on DialogContent forces React to remount the inner
 * content whenever a different item is shown — so image/scroll state doesn't
 * leak across items.
 */
export default function ItemDetailsDialog({
  item,
  open,
  onOpenChange,
}: ItemDetailsDialogProps) {
  const qty = useBasketStore((state) =>
    item ? (state.lines[item.id]?.qty ?? 0) : 0,
  )
  const add = useBasketStore((state) => state.add)
  const setQty = useBasketStore((state) => state.setQty)

  if (!item) {
    // Render the Dialog root with a hidden content so AnimatePresence
    // transitions work cleanly when there's no item to show.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" aria-hidden>
          <DialogTitle className="sr-only">جزئیات آیتم</DialogTitle>
          <DialogDescription className="sr-only">
            در حال بارگذاری…
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={item.id}
        className="nice-scrollbar max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl border-0 bg-background p-0 shadow-2xl sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        <DialogDescription className="sr-only">
          جزئیات و افزودن به سبد خرید
        </DialogDescription>

        {/* Hero image with gradient + close button */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-3xl bg-muted sm:aspect-[2/1]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <UtensilsCrossed className="size-16 text-muted-foreground/40" aria-hidden />
            </div>
          )}
          {/* Subtle gradient overlay so the close button stays readable on any image */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/10"
          />
          {item.featured ? (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-accent/90 px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-md backdrop-blur">
              پیشنهاد شف
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="بستن"
            className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              {item.name}
            </h2>
            <Badge
              variant="secondary"
              className="shrink-0 rounded-full px-3 py-1 text-sm"
            >
              {categoryLabel(item.category)}
            </Badge>
          </div>

          {item.description ? (
            <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              {item.description}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">قیمت</span>
              <span className="text-xl font-extrabold text-accent-foreground sm:text-2xl">
                {formatPrice(item.price)}
              </span>
            </div>

            {qty === 0 ? (
              <Button
                size="lg"
                className="h-12 rounded-full px-6 text-base font-bold"
                onClick={() => add(item)}
                aria-label={`افزودن ${item.name} به سبد خرید`}
              >
                <Plus className="size-5" aria-hidden />
                افزودن به سبد
              </Button>
            ) : (
              <div className="flex items-center gap-1 rounded-full bg-primary p-1 text-primary-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                  aria-label={`کاهش تعداد ${item.name}`}
                  onClick={() => setQty(item.id, qty - 1)}
                >
                  <Minus className="size-5" aria-hidden />
                </Button>
                <span
                  className="min-w-8 text-center text-base font-extrabold"
                  aria-live="polite"
                >
                  {faNumber(qty)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                  aria-label={`افزایش تعداد ${item.name}`}
                  onClick={() => setQty(item.id, qty + 1)}
                >
                  <Plus className="size-5" aria-hidden />
                </Button>
              </div>
            )}
          </div>

          {/* Quick "view basket" CTA when item is in basket */}
          <AnimatePresence>
            {qty > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-3 rounded-2xl bg-primary/5 p-4 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-primary">
                  <ShoppingBasket className="size-4" aria-hidden />
                  {faNumber(qty)} عدد در سبد شما
                </span>
                <span className="text-xs text-muted-foreground">
                  مجموع این آیتم: {formatPrice(qty * item.price)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
