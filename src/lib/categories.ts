import {
  Croissant,
  Beef,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  Coffee,
  Soup,
  GlassWater,
  Leaf,
  Milk,
  CakeSlice,
  CupSoda,
  type LucideIcon,
} from "lucide-react"

export interface CategoryDef {
  key: string
  label: string
  icon: LucideIcon
}

/**
 * The 12 fixed menu categories — order defines display order.
 *
 * Order is intentional and matches the brand's required layout:
 *   صبحانه · برگر · پیتزا · ساندویچ · پاستا · قهوه
 *   نوشیدنی گرم · نوشیدنی سرد · دمنوش · شیک · دسر · نوشیدنی
 */
export const CATEGORIES: CategoryDef[] = [
  { key: "breakfast", label: "صبحانه", icon: Croissant },
  { key: "burgers", label: "برگر", icon: Beef },
  { key: "pizza", label: "پیتزا", icon: Pizza },
  { key: "sandwich", label: "ساندویچ", icon: Sandwich },
  { key: "pasta", label: "پاستا", icon: UtensilsCrossed },
  { key: "coffee", label: "قهوه", icon: Coffee },
  { key: "hotDrinks", label: "نوشیدنی گرم", icon: Soup },
  { key: "coldDrinks", label: "نوشیدنی سرد", icon: GlassWater },
  { key: "herbalTea", label: "دمنوش", icon: Leaf },
  { key: "shake", label: "شیک", icon: Milk },
  { key: "dessert", label: "دسر", icon: CakeSlice },
  { key: "drinks", label: "نوشیدنی", icon: CupSoda },
]

export const CATEGORY_KEYS: string[] = CATEGORIES.map((c) => c.key)

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}
