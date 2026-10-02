"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Minimal shape needed to add an item to the basket. */
export interface BasketAddItem {
  id: string
  name: string
  /** Effective unit price (base + selected option deltas) in «هزار تومان». */
  price: number
  image: string | null
  /** Names of the selected options at add time (e.g. «اندازه بزرگ»).
   *  Optional — only present when the item had option groups. */
  selectedOptions?: string[]
}

export interface BasketLine extends BasketAddItem {
  qty: number
}

/** Basket lines keyed by a composite key: `${itemId}` when no options are
 *  selected, or `${itemId}|${selectedOptions.join(",")}` when options are
 *  present — so the same item with different option combinations becomes
 *  separate basket lines (the customer can have a "small coffee" and a
 *  "large coffee with extra shot" as two distinct lines). */
export type BasketLines = Record<string, BasketLine>

interface BasketState {
  lines: BasketLines
  add: (item: BasketAddItem) => void
  setQty: (lineKey: string, qty: number) => void
  remove: (lineKey: string) => void
  clear: () => void
}

/** Compute the basket line key for a given add-item. Same item + same
 *  options → same key (so adding the same configuration increments the
 *  existing line). Different options → different key (separate line). */
export function basketLineKey(item: BasketAddItem): string {
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    return `${item.id}|${item.selectedOptions.join(",")}`
  }
  return item.id
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set) => ({
      lines: {},
      add: (item) =>
        set((state) => {
          const key = basketLineKey(item)
          const existing = state.lines[key]
          if (existing) {
            return {
              lines: { ...state.lines, [key]: { ...existing, qty: existing.qty + 1 } },
            }
          }
          const next: BasketLine = {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            selectedOptions: item.selectedOptions,
            qty: 1,
          }
          return { lines: { ...state.lines, [key]: next } }
        }),
      setQty: (id, qty) =>
        set((state) => {
          if (!state.lines[id]) return state
          if (qty <= 0) {
            const rest = { ...state.lines }
            delete rest[id]
            return { lines: rest }
          }
          return { lines: { ...state.lines, [id]: { ...state.lines[id], qty } } }
        }),
      remove: (id) =>
        set((state) => {
          if (!state.lines[id]) return state
          const rest = { ...state.lines }
          delete rest[id]
          return { lines: rest }
        }),
      clear: () => set({ lines: {} }),
    }),
    { name: "lamfood-basket", skipHydration: true }
  )
)

/** Total number of units across all lines. */
export function basketCount(lines: BasketLines): number {
  return Object.values(lines).reduce((sum, line) => sum + line.qty, 0)
}

/** Total price (in هزار تومان units) across all lines. */
export function basketTotal(lines: BasketLines): number {
  return Object.values(lines).reduce((sum, line) => sum + line.qty * line.price, 0)
}

/** Lines as an ordered array (insertion order of the object keys). */
export function basketLineList(lines: BasketLines): BasketLine[] {
  return Object.values(lines)
}
