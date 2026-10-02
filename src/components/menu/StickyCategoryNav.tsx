"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Search, ShoppingBasket, X, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import SearchFilters, { type SortKey } from "@/components/menu/SearchFilters"
import ThemeToggle from "@/components/menu/ThemeToggle"
import { faNumber } from "@/lib/format"
import { basketCount, useBasketStore } from "@/lib/basket-store"

export interface NavGroup {
  key: string
  label: string
  icon: LucideIcon
  count: number
}

interface StickyCategoryNavProps {
  groups: NavGroup[]
  query: string
  onQueryChange: (query: string) => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  searchActive: boolean
  resultCount: number
  onOpenBasket: () => void
  /** Currently selected category filter (null = all). */
  categoryFilter: string | null
  onCategoryFilterChange: (key: string | null) => void
  /** Currently selected sort key. */
  sort: SortKey
  onSortChange: (sort: SortKey) => void
}

export default function StickyCategoryNav({
  groups,
  query,
  onQueryChange,
  searchOpen,
  onSearchOpenChange,
  searchActive,
  resultCount,
  onOpenBasket,
  categoryFilter,
  onCategoryFilterChange,
  sort,
  onSortChange,
}: StickyCategoryNavProps) {
  const [observed, setObserved] = useState<string>(groups[0]?.key ?? "")
  const count = useBasketStore((state) => basketCount(state.lines))

  // Derived (not an effect): if groups changed and the observed key vanished,
  // fall back to the first group without cascading renders.
  const active =
    groups.length > 0 && groups.some((g) => g.key === observed)
      ? observed
      : groups[0]?.key ?? ""

  // Scroll-spy: highlight the category whose section crosses the viewport band.
  useEffect(() => {
    if (searchActive || groups.length === 0) return
    const sections = groups
      .map((g) => document.getElementById(`cat-${g.key}`))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setObserved(entry.target.id.replace("cat-", ""))
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [groups, searchActive])

  const scrollToCategory = (key: string) => {
    document.getElementById(`cat-${key}`)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav
      aria-label="دسته‌بندی منو و جستجو"
      className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex h-16 items-center gap-2">
          <Button
            variant={searchOpen ? "secondary" : "outline"}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            aria-label="جستجو"
            aria-expanded={searchOpen}
            onClick={() => onSearchOpenChange(!searchOpen)}
          >
            <Search className="h-5 w-5" aria-hidden />
          </Button>

          <div className="no-scrollbar relative flex flex-1 items-center gap-2 overflow-x-auto py-2">
            {groups.map((group) => {
              const isActive = !searchActive && active === group.key
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => scrollToCategory(group.key)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                      : "bg-muted text-foreground ring-1 ring-transparent hover:bg-secondary hover:ring-border"
                  }`}
                >
                  <group.icon className="h-4 w-4" aria-hidden />
                  {group.label}
                  {isActive ? (
                    <span
                      aria-hidden
                      className="me-[-2px] h-1.5 w-1.5 rounded-full bg-accent"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="relative h-11 w-11 shrink-0 rounded-full"
            aria-label="سبد خرید"
            onClick={onOpenBasket}
          >
            <ShoppingBasket className="h-5 w-5" aria-hidden />
            {count > 0 && (
              <Badge className="absolute -top-1 -left-1 h-5 min-w-5 rounded-full px-1 text-[11px]">
                {faNumber(count)}
              </Badge>
            )}
          </Button>

          <ThemeToggle className="hidden sm:inline-flex" />
        </div>

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="search-row"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="relative pb-3">
                <Search
                  className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="جستجو در منو (نام، توضیحات، دسته)…"
                  inputMode="search"
                  autoFocus
                  aria-label="جستجو در منو"
                  className="h-11 rounded-full pe-4 ps-11"
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    aria-label="پاک کردن جستجو"
                    onClick={() => onQueryChange("")}
                    className="absolute end-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {query.trim().length > 0 && (
                  <p className="pt-1.5 text-center text-xs text-muted-foreground">
                    {faNumber(resultCount)} نتیجه
                  </p>
                )}
              </div>
              {/* Category + sort filters — only meaningful once a query is active. */}
              <SearchFilters
                active={searchActive}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={onCategoryFilterChange}
                sort={sort}
                onSortChange={onSortChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
