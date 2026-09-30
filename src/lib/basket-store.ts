"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Minimal shape needed to add an item to the basket. */
export interface BasketAddItem {
  id: string
  name: string
  price: number
  image: string | null
}

export interface BasketLine extends BasketAddItem {
  qty: number
}

/** Basket lines keyed by menu item id. */
export type BasketLines = Record<string, BasketLine>

interface BasketState {
  lines: BasketLines
  add: (item: BasketAddItem) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set) => ({
      lines: {},
      add: (item) =>
        set((state) => {
          const existing = state.lines[item.id]
          if (existing) {
            return {
              lines: { ...state.lines, [item.id]: { ...existing, qty: existing.qty + 1 } },
            }
          }
          const next: BasketLine = {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            qty: 1,
          }
          return { lines: { ...state.lines, [item.id]: next } }
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
