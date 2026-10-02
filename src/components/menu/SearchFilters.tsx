"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowDownUp, LayoutGrid, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CATEGORIES } from "@/lib/categories"
import { cn } from "@/lib/utils"

export type SortKey = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc" | "popular"

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "پیش‌فرض" },
  { key: "popular", label: "محبوب‌ترین" },
  { key: "price-asc", label: "ارزان‌ترین" },
  { key: "price-desc", label: "گران‌ترین" },
  { key: "name-asc", label: "نام (الفبا)" },
  { key: "name-desc", label: "نام (معکوس)" },
]

interface SearchFiltersProps {
  /** Active search query (filters only show when query is non-empty). */
  active: boolean
  /** Currently selected category filter (null = all categories). */
  categoryFilter: string | null
  onCategoryFilterChange: (key: string | null) => void
  /** Currently selected sort key. */
  sort: SortKey
  onSortChange: (sort: SortKey) => void
}

/**
 * Inline filter bar that appears below the search input whenever the user is
 * searching. Provides:
 *  - **Category filter chips** — quickly narrow results to a single category.
 *    The "همه" (All) chip clears the filter.
 *  - **Sort dropdown** — default / cheapest / most expensive.
 *
 * The filters are local UI state owned by the parent (page.tsx) so they
 * persist across re-renders. Hidden when there's no active search.
 */
export default function SearchFilters({
  active,
  categoryFilter,
  onCategoryFilterChange,
  sort,
  onSortChange,
}: SearchFiltersProps) {
  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-t pt-3">
            {/* Category filter rail */}
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                <LayoutGrid className="size-3.5" aria-hidden />
                دسته:
              </span>
              <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
                <CategoryChip
                  active={categoryFilter === null}
                  onClick={() => onCategoryFilterChange(null)}
                >
                  همه
                </CategoryChip>
                {CATEGORIES.map((c) => (
                  <CategoryChip
                    key={c.key}
                    active={categoryFilter === c.key}
                    onClick={() =>
                      onCategoryFilterChange(
                        categoryFilter === c.key ? null : c.key,
                      )
                    }
                  >
                    <c.icon className="size-3.5" aria-hidden />
                    {c.label}
                  </CategoryChip>
                ))}
              </div>
            </div>

            {/* Sort rail */}
            <div className="flex items-center gap-2">
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                <ArrowDownUp className="size-3.5" aria-hidden />
                ترتیب:
              </span>
              <div className="flex flex-1 items-center gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <SortChip
                    key={opt.key}
                    active={sort === opt.key}
                    onClick={() => onSortChange(opt.key)}
                  >
                    {opt.label}
                  </SortChip>
                ))}
              </div>
              {categoryFilter !== null || sort !== "default" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onCategoryFilterChange(null)
                    onSortChange("default")
                  }}
                >
                  <X className="size-3.5" aria-hidden />
                  پاک کردن فیلترها
                </Button>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
          : "bg-muted text-foreground ring-1 ring-transparent hover:bg-secondary hover:ring-border",
      )}
    >
      {children}
    </button>
  )
}

function SortChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
        active
          ? "bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/30"
          : "bg-muted text-foreground ring-1 ring-transparent hover:bg-secondary hover:ring-border",
      )}
    >
      {children}
    </button>
  )
}
