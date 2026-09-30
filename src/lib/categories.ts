import {
  Croissant,
  Beef,
  Pizza,
  Sandwich,
  CakeSlice,
  UtensilsCrossed,
  CupSoda,
  Coffee,
  type LucideIcon,
} from "lucide-react"

export interface CategoryDef {
  key: string
  label: string
  icon: LucideIcon
}

/** The 8 fixed menu categories — order defines display order. */
export const CATEGORIES: CategoryDef[] = [
  { key: "breakfast", label: "صبحانه", icon: Croissant },
  { key: "burgers", label: "برگر", icon: Beef },
  { key: "pizza", label: "پیتزا", icon: Pizza },
  { key: "sandwich", label: "ساندویچ", icon: Sandwich },
  { key: "pasta", label: "پاستا", icon: UtensilsCrossed },
  { key: "dessert", label: "دسر", icon: CakeSlice },
  { key: "coffee", label: "قهوه", icon: Coffee },
  { key: "drinks", label: "نوشیدنی", icon: CupSoda },
]

export const CATEGORY_KEYS: string[] = CATEGORIES.map((c) => c.key)

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}
