"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Minus, Plus, SearchX, UtensilsCrossed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CATEGORIES } from "@/lib/categories"
import { faNumber, formatPrice } from "@/lib/format"
import { useBasketStore } from "@/lib/basket-store"
import type { MenuItemDTO } from "@/lib/types"

interface MenuSectionProps {
  items: MenuItemDTO[]
  /** Search results (only meaningful when query is non-empty). */
  results: MenuItemDTO[]
  query: string
  onClearSearch: () => void
}

function ItemCard({ item, index }: { item: MenuItemDTO; index: number }) {
  const qty = useBasketStore((state) => state.lines[item.id]?.qty ?? 0)
  const add = useBasketStore((state) => state.add)
  const setQty = useBasketStore((state) => state.setQty)

  const category = CATEGORIES.find((c) => c.key === item.category)
  const CategoryIcon = category?.icon ?? UtensilsCrossed

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
    >
      <Card className="group gap-0 overflow-hidden rounded-2xl py-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CategoryIcon className="h-14 w-14 text-muted-foreground/40" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-base font-bold">{item.name}</h3>
          <p className="min-h-[2.5rem] text-sm leading-5 text-muted-foreground line-clamp-2">
            {item.description ?? ""}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="rounded-full bg-accent/15 px-3 py-1.5 text-sm font-extrabold text-accent-foreground">
              {formatPrice(item.price)}
            </span>

            {qty === 0 ? (
              <motion.div whileTap={{ scale: 0.92 }} className="inline-flex">
                <Button
                  size="sm"
                  className="h-10 rounded-full px-4"
                  onClick={() => add(item)}
                  aria-label={`افزودن ${item.name} به سبد خرید`}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  افزودن
                </Button>
              </motion.div>
            ) : (
              <div className="flex h-10 items-center gap-1 rounded-full bg-primary px-1 text-primary-foreground">
                <motion.div whileTap={{ scale: 0.92 }} className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                    aria-label={`کاهش تعداد ${item.name}`}
                    onClick={() => setQty(item.id, qty - 1)}
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                </motion.div>
                <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">
                  {faNumber(qty)}
                </span>
                <motion.div whileTap={{ scale: 0.92 }} className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                    aria-label={`افزایش تعداد ${item.name}`}
                    onClick={() => setQty(item.id, qty + 1)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function MenuSection({ items, results, query, onClearSearch }: MenuSectionProps) {
  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        items: items.filter((item) => item.category === category.key),
      })).filter((group) => group.items.length > 0),
    [items]
  )

  const trimmedQuery = query.trim()

  // Search mode
  if (trimmedQuery.length > 0) {
    return (
      <section aria-label="نتایج جستجو" className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold sm:text-xl">
            نتایج جستجو برای «{trimmedQuery}»
          </h2>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {faNumber(results.length)} نتیجه
          </Badge>
        </header>

        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-muted p-6">
              <SearchX className="h-10 w-10 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="text-lg font-bold">موردی یافت نشد</p>
            <p className="text-sm text-muted-foreground">
              عبارت دیگری را امتحان کنید یا جستجو را پاک کنید.
            </p>
            <Button variant="outline" className="rounded-full px-6" onClick={onClearSearch}>
              پاک کردن جستجو
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </section>
    )
  }

  // Empty menu
  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center">
        <div className="rounded-full bg-muted p-6">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/60" aria-hidden />
        </div>
        <h2 className="text-2xl font-extrabold">منو به‌زودی</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          هنوز آیتمی ثبت نشده است؛ به‌زودی با منوی کامل ما همراه باشید.
        </p>
      </div>
    )
  }

  // Normal category mode
  return (
    <div>
      {groups.map((group) => (
        <section
          key={group.key}
          id={`cat-${group.key}`}
          aria-labelledby={`cat-heading-${group.key}`}
          className="mx-auto w-full max-w-6xl px-4 py-8"
        >
          <header className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
              <group.icon className="h-5 w-5" aria-hidden />
            </div>
            <h2 id={`cat-heading-${group.key}`} className="text-xl font-extrabold sm:text-2xl">
              {group.label}
            </h2>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {faNumber(group.items.length)} آیتم
            </Badge>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
