"use client"

import { motion } from "framer-motion"
import { Minus, Plus, Sparkles, UtensilsCrossed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { categoryLabel } from "@/lib/categories"
import { faNumber, formatPrice } from "@/lib/format"
import { useBasketStore } from "@/lib/basket-store"
import type { MenuItemDTO } from "@/lib/types"

interface FeaturedSectionProps {
  items: MenuItemDTO[]
  /** When the user is searching, hide this section (it's category-agnostic). */
  hidden?: boolean
  /** Open the item details dialog for a given item id. */
  onOpenItem?: (id: string) => void
}

/**
 * "پیشنهاد شف" — a horizontally-scrolling rail of featured items shown above
 * the categories grid. Curated by the admin (the `featured` flag on MenuItem).
 *
 * Each card shows the item image, name, short description, price, and an inline
 * add-to-basket stepper. Clicking the card (image or title) opens the item
 * details dialog when `onOpenItem` is provided.
 */
export default function FeaturedSection({
  items,
  hidden = false,
  onOpenItem,
}: FeaturedSectionProps) {
  if (hidden || items.length === 0) return null

  return (
    <section
      id="featured"
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-2 pt-8 sm:pt-10"
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <div>
            <h2
              id="featured-heading"
              className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl"
            >
              پیشنهاد شف
              <Badge
                variant="secondary"
                className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] text-accent-foreground"
              >
                ویژه
              </Badge>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              منتخبی از محبوب‌ترین‌های لم‌فود — دست‌چیده شده برای شما.
            </p>
          </div>
        </div>
      </header>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((item, index) => (
          <FeaturedCard
            key={item.id}
            item={item}
            index={index}
            onOpenItem={onOpenItem ? () => onOpenItem(item.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}

function FeaturedCard({
  item,
  index,
  onOpenItem,
}: {
  item: MenuItemDTO
  index: number
  onOpenItem?: () => void
}) {
  const qty = useBasketStore((state) => state.lines[item.id]?.qty ?? 0)
  const add = useBasketStore((state) => state.add)
  const setQty = useBasketStore((state) => state.setQty)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.05, ease: "easeOut" }}
      className="snap-start"
    >
      <Card className="group flex h-full w-[280px] shrink-0 flex-col gap-0 overflow-hidden rounded-2xl py-0 transition-shadow hover:shadow-xl sm:w-[300px]">
        {/* Image — clickable to open the details dialog */}
        <button
          type="button"
          onClick={onOpenItem}
          aria-label={`مشاهدهٔ جزئیات ${item.name}`}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-right"
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-14 w-14 text-muted-foreground/40" aria-hidden />
            </div>
          )}
          {/* Always-visible featured ribbon */}
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-1 text-[11px] font-bold text-accent-foreground shadow-md backdrop-blur">
            <Sparkles className="size-3" aria-hidden />
            پیشنهاد شف
          </span>
        </button>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={onOpenItem}
              className="min-w-0 flex-1 text-right"
              aria-label={`مشاهدهٔ جزئیات ${item.name}`}
            >
              <h3 className="line-clamp-1 text-base font-bold leading-6 transition-colors hover:text-primary">
                {item.name}
              </h3>
            </button>
            <Badge variant="secondary" className="shrink-0 px-2 py-0 text-[10px]">
              {categoryLabel(item.category)}
            </Badge>
          </div>

          <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">
            {item.description ?? ""}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="rounded-full bg-accent/15 px-3 py-1.5 text-sm font-extrabold text-accent-foreground">
              {formatPrice(item.price)}
            </span>

            {qty === 0 ? (
              <Button
                size="sm"
                className="h-10 rounded-full px-4"
                onClick={() => add(item)}
                aria-label={`افزودن ${item.name} به سبد خرید`}
              >
                <Plus className="size-4" aria-hidden />
                افزودن
              </Button>
            ) : (
              <div className="flex h-10 items-center gap-1 rounded-full bg-primary px-1 text-primary-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                  aria-label={`کاهش تعداد ${item.name}`}
                  onClick={() => setQty(item.id, qty - 1)}
                >
                  <Minus className="size-4" aria-hidden />
                </Button>
                <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">
                  {faNumber(qty)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                  aria-label={`افزایش تعداد ${item.name}`}
                  onClick={() => setQty(item.id, qty + 1)}
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
