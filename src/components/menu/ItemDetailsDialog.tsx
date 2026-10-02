"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Flame, Minus, Plus, ShoppingBasket, UtensilsCrossed, X } from "lucide-react"
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
import type { ItemOptionGroupDTO, MenuItemDTO } from "@/lib/types"

interface ItemDetailsDialogProps {
  item: MenuItemDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Full-screen-friendly details dialog for a single MenuItemDTO. Shows a large
 * preview image, full description (no line-clamp), category badge, price,
 * option groups (if any), and an inline add-to-basket stepper. Closes on
 * Escape, backdrop click, or the X button.
 *
 * When the item has option groups (e.g. size, spice level), the customer
 * selects one option per group (radio-style). The selected options' price
 * deltas are added to the base price; the effective price is shown live.
 * On add-to-basket, the selected option names + effective price are passed
 * to the basket store.
 *
 * The `key={item.id}` on DialogContent forces React to remount the inner
 * content whenever a different item is shown — so image/scroll/option state
 * doesn't leak across items.
 */
export default function ItemDetailsDialog({
  item,
  open,
  onOpenChange,
}: ItemDetailsDialogProps) {
  // `key={item.id}` on DialogContent handles remount, so we can use plain
  // useState for the selected options — the state is fresh per item.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {item ? (
        <ItemDetailsContent
          key={item.id}
          item={item}
          onOpenChange={onOpenChange}
        />
      ) : (
        <DialogContent className="hidden" aria-hidden>
          <DialogTitle className="sr-only">جزئیات آیتم</DialogTitle>
          <DialogDescription className="sr-only">
            در حال بارگذاری…
          </DialogDescription>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ItemDetailsContent({
  item,
  onOpenChange,
}: {
  item: MenuItemDTO
  onOpenChange: (open: boolean) => void
}) {
  const qty = useBasketStore((state) => state.lines[item.id]?.qty ?? 0)
  const add = useBasketStore((state) => state.add)
  const setQty = useBasketStore((state) => state.setQty)

  /** Fire-and-forget view increment when the dialog opens. Uses a ref so
   *  it only fires once per mount (the `key={item.id}` on DialogContent
   *  remounts the component per item, so each open = one increment). */
  const viewFiredRef = useRef(false)
  useEffect(() => {
    if (viewFiredRef.current) return
    viewFiredRef.current = true
    // Fire-and-forget — errors are swallowed by the API route + we don't
    // want a failed view-tracking call to block the dialog UX.
    void fetch("/api/menu/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    }).catch(() => {})
  }, [item.id])

  /** Selected option ids per group id. For single-select groups, the array
   *  has exactly one element (the selected option). For multiSelect groups,
   *  it can have zero or more elements (the checked options).
   *
   *  Initialized from defaults: single-select picks the first isDefault (or
   *  the first option); multiSelect picks all isDefault options. */
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {}
    for (const g of item.options) {
      if (g.multiSelect) {
        const defaults = g.options.filter((o) => o.isDefault).map((o) => o.id)
        init[g.id] = defaults
      } else {
        const def = g.options.find((o) => o.isDefault) ?? g.options[0]
        init[g.id] = def ? [def.id] : []
      }
    }
    return init
  })

  /** Compute the effective unit price (base + selected option deltas) and the
   *  selected option names (for display + basket snapshot). */
  const { effectivePrice, selectedOptionNames } = useMemo(() => {
    let delta = 0
    const names: string[] = []
    for (const g of item.options) {
      const selIds = selectedByGroup[g.id] ?? []
      for (const selId of selIds) {
        const sel = g.options.find((o) => o.id === selId)
        if (sel) {
          delta += sel.price
          names.push(sel.name)
        }
      }
    }
    return { effectivePrice: item.price + delta, selectedOptionNames: names }
  }, [item, selectedByGroup])

  /** Select an option in a single-select group (radio behavior — replaces
   *  the previous selection). */
  function selectOption(groupId: string, optionId: string) {
    setSelectedByGroup((prev) => ({ ...prev, [groupId]: [optionId] }))
  }

  /** Toggle an option in a multi-select group (checkbox behavior — adds or
   *  removes the option from the selected set). */
  function toggleOption(groupId: string, optionId: string) {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? []
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      return { ...prev, [groupId]: next }
    })
  }

  return (
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

        {/* Option groups (if any) */}
        {item.options.length > 0 ? (
          <div className="grid gap-3">
            {item.options.map((group) => (
              <OptionGroup
                key={group.id}
                group={group}
                selectedIds={selectedByGroup[group.id] ?? []}
                onSelect={(optId) => selectOption(group.id, optId)}
                onToggle={(optId) => toggleOption(group.id, optId)}
              />
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {item.options.length > 0 && selectedOptionNames.length > 0
                ? "قیمت با گزینه‌های انتخاب‌شده"
                : "قیمت"}
            </span>
            <span className="text-xl font-extrabold text-accent-foreground sm:text-2xl">
              {formatPrice(effectivePrice)}
            </span>
            {item.options.length > 0 && selectedOptionNames.length > 0 ? (
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedOptionNames.join("، ")}
              </span>
            ) : null}
          </div>

          {qty === 0 ? (
            <Button
              size="lg"
              className="h-12 rounded-full px-6 text-base font-bold"
              onClick={() =>
                add({
                  id: item.id,
                  name: item.name,
                  price: effectivePrice,
                  image: item.image,
                  selectedOptions: selectedOptionNames,
                })
              }
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
                مجموع این آیتم: {formatPrice(qty * effectivePrice)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DialogContent>
  )
}

/* ------------------------------------------------------------------ */
/* Option group (radio or checkbox selector)                           */
/* ------------------------------------------------------------------ */

function OptionGroup({
  group,
  selectedIds,
  onSelect,
  onToggle,
}: {
  group: ItemOptionGroupDTO
  /** For single-select: exactly one id (or empty). For multiSelect: zero+. */
  selectedIds: string[]
  onSelect: (optionId: string) => void
  onToggle: (optionId: string) => void
}) {
  const isMulti = !!group.multiSelect
  return (
    <fieldset className="grid gap-2 rounded-2xl border bg-card p-3">
      <legend className="flex items-center gap-2 px-1">
        <span className="text-sm font-bold">{group.label}</span>
        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
          {isMulti ? "چندانتخابی" : "یک گزینه"}
        </Badge>
      </legend>
      <div className="grid gap-1.5">
        {group.options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id)
          return (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={group.id}
                  checked={isSelected}
                  onChange={() => (isMulti ? onToggle(opt.id) : onSelect(opt.id))}
                  className="size-4 cursor-pointer accent-primary"
                  aria-label={opt.name}
                />
                <span className="text-sm font-medium">{opt.name}</span>
                {opt.isDefault ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    پیش‌فرض
                  </Badge>
                ) : null}
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                {opt.price > 0 ? `+${formatPrice(opt.price)}` : "رایگان"}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
