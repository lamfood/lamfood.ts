"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import BackToTop from "@/components/menu/BackToTop"
import BasketSheet from "@/components/menu/BasketSheet"
import CategoryGrid from "@/components/menu/CategoryGrid"
import FeaturedSection from "@/components/menu/FeaturedSection"
import FloatingBasket from "@/components/menu/FloatingBasket"
import Hero from "@/components/menu/Hero"
import InfoCards from "@/components/menu/InfoCards"
import ItemDetailsDialog from "@/components/menu/ItemDetailsDialog"
import LocationSheet from "@/components/menu/LocationSheet"
import MenuFooter from "@/components/menu/MenuFooter"
import MenuSection from "@/components/menu/MenuSection"
import StickyCategoryNav, { type NavGroup } from "@/components/menu/StickyCategoryNav"
import type { SortKey } from "@/components/menu/SearchFilters"
import { ApiError, apiFetch } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { useBasketStore } from "@/lib/basket-store"
import type { MenuItemDTO, MenuResponse, PublicConfigResponse, RestaurantConfig } from "@/lib/types"

type PageStatus = "loading" | "error" | "ready"

/** Compute whether the restaurant is open right now in Tehran local time. */
function computeOpenNow(openHourFrom: string, openHourTo: string): boolean {
  const parseHour = (value: string): number => {
    const parts = value.split(":")
    const hours = Number(parts[0])
    const minutes = Number(parts[1] ?? "0")
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN
    return hours * 60 + minutes
  }

  const fromMin = parseHour(openHourFrom)
  let toMin = parseHour(openHourTo)
  if (toMin === 1440) toMin = 1440 // "24:00" = end of day
  if (Number.isNaN(fromMin) || Number.isNaN(toMin)) return true

  const tehranTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())
  const timeParts = tehranTime.split(":")
  const nowMin = (Number(timeParts[0]) % 24) * 60 + Number(timeParts[1])

  if (toMin <= fromMin) {
    // Overnight window (e.g. 18:00 → 02:00)
    return nowMin >= fromMin || nowMin < toMin
  }
  return nowMin >= fromMin && nowMin < toMin
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true">
      <span className="sr-only">در حال بارگذاری منو…</span>
      <Skeleton className="h-72 w-full rounded-none sm:h-96" />
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-6">
        <TriangleAlert className="h-10 w-10 text-destructive" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold">اوپس! خطایی رخ داد</h1>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      <Button className="mt-1 h-11 rounded-full px-6" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        تلاش مجدد
      </Button>
    </div>
  )
}

export default function Home() {
  const [status, setStatus] = useState<PageStatus>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [config, setConfig] = useState<RestaurantConfig | null>(null)
  const [items, setItems] = useState<MenuItemDTO[] | null>(null)

  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [basketOpen, setBasketOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [isOpenNow, setIsOpenNow] = useState<boolean | null>(null)
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null)
  // Search filters — owned by the page so they persist across re-renders.
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>("default")

  // Rehydrate the persisted basket after mount (skipHydration: true).
  useEffect(() => {
    useBasketStore.persist.rehydrate()
  }, [])

  const loadData = useCallback(async () => {
    setStatus("loading")
    setErrorMessage(null)
    try {
      const [configResult, menuResult] = await Promise.all([
        apiFetch<PublicConfigResponse>("/api/config"),
        apiFetch<MenuResponse>("/api/menu"),
      ])
      setConfig(configResult.restaurant)
      setItems(menuResult.items)
      setStatus("ready")
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید."
      )
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0)
    return () => clearTimeout(timer)
  }, [loadData])

  // Compute open/closed status after mount to avoid hydration mismatch.
  useEffect(() => {
    if (!config) return
    const timer = setTimeout(
      () => setIsOpenNow(computeOpenNow(config.openHourFrom, config.openHourTo)),
      0
    )
    return () => clearTimeout(timer)
  }, [config])

  const groups = useMemo<NavGroup[]>(
    () =>
      CATEGORIES.map((category) => ({
        key: category.key,
        label: category.label,
        icon: category.icon,
        count: (items ?? []).filter((item) => item.category === category.key).length,
      })).filter((group) => group.count > 0),
    [items]
  )

  const searchQuery = query.trim().toLowerCase()
  // When the user clears the search query, reset the filter/sort too — done
  // inline (not in an effect) so we don't trigger a cascading re-render.
  const effectiveCategoryFilter =
    searchQuery.length === 0 ? null : categoryFilter
  const effectiveSort: SortKey =
    searchQuery.length === 0 ? "default" : sort

  const searchResults = useMemo<MenuItemDTO[]>(() => {
    if (searchQuery.length === 0) return []
    // Search by name, description, AND category label — so searching
    // "برگر" matches items in the burgers category even if the name
    // doesn't contain the word.
    const matched = (items ?? []).filter((item) => {
      const catLabel = CATEGORIES.find((c) => c.key === item.category)?.label ?? ""
      return (
        item.name.toLowerCase().includes(searchQuery) ||
        (item.description ?? "").toLowerCase().includes(searchQuery) ||
        catLabel.toLowerCase().includes(searchQuery)
      )
    })
    // Apply category filter (null = all categories).
    const filtered =
      effectiveCategoryFilter === null
        ? matched
        : matched.filter((i) => i.category === effectiveCategoryFilter)
    // Apply sort (default = preserve original order).
    if (effectiveSort === "price-asc") {
      return [...filtered].sort((a, b) => a.price - b.price)
    }
    if (effectiveSort === "price-desc") {
      return [...filtered].sort((a, b) => b.price - a.price)
    }
    if (effectiveSort === "name-asc") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "fa"))
    }
    if (effectiveSort === "name-desc") {
      return [...filtered].sort((a, b) => b.name.localeCompare(a.name, "fa"))
    }
    return filtered
  }, [items, searchQuery, effectiveCategoryFilter, effectiveSort])

  const searchActive = searchQuery.length > 0

  /** Smooth-scroll to a category section (used by both the sticky nav and the
    * "view all categories" grid). */
  const scrollToCategory = useCallback((key: string) => {
    document.getElementById(`cat-${key}`)?.scrollIntoView({ behavior: "smooth" })
  }, [])

  /** Featured items (admin-curated) — shown above the categories grid as a
    * horizontally-scrolling rail. Hidden while searching. */
  const featuredItems = useMemo(
    () => (items ?? []).filter((item) => item.featured),
    [items]
  )

  /** The MenuItemDTO currently shown in the details dialog (or null). */
  const detailsItem = useMemo(
    () => (detailsItemId ? (items ?? []).find((i) => i.id === detailsItemId) ?? null : null),
    [items, detailsItemId]
  )

  /** Open the details dialog for a given item id. */
  const openItemDetails = useCallback((id: string) => {
    setDetailsItemId(id)
  }, [])

  /** Close the details dialog. */
  const closeItemDetails = useCallback(() => {
    setDetailsItemId(null)
  }, [])

  if (status === "loading") {
    return <LoadingView />
  }

  if (status === "error" || !config || items === null) {
    return (
      <ErrorView
        message={errorMessage ?? "خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید."}
        onRetry={() => void loadData()}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Hero
        config={config}
        isOpenNow={isOpenNow}
        onOpenLocation={() => setLocationOpen(true)}
      />

      <InfoCards
        config={config}
        isOpenNow={isOpenNow}
        onOpenLocation={() => setLocationOpen(true)}
      />

      <StickyCategoryNav
        groups={groups}
        query={query}
        onQueryChange={setQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchActive={searchActive}
        resultCount={searchResults.length}
        onOpenBasket={() => setBasketOpen(true)}
        categoryFilter={effectiveCategoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        sort={effectiveSort}
        onSortChange={setSort}
      />

      {/* "پیشنهاد شف" — curated featured items rail (admin-controlled via the
          `featured` flag). Hidden while searching. */}
      <FeaturedSection
        items={featuredItems}
        hidden={searchActive}
        onOpenItem={openItemDetails}
      />

      {/* "View all categories at once" — a grid overview that complements the
          horizontal chip rail in the sticky nav. Hidden while searching. */}
      <CategoryGrid
        groups={groups}
        hidden={searchActive}
        onSelect={scrollToCategory}
      />

      <main id="menu" className="flex-1">
        <MenuSection
          items={items}
          results={searchResults}
          query={query}
          onClearSearch={() => setQuery("")}
          onOpenItem={openItemDetails}
        />
      </main>

      <MenuFooter config={config} className="mt-auto" />

      <BackToTop />
      <FloatingBasket onOpen={() => setBasketOpen(true)} />
      <ItemDetailsDialog
        item={detailsItem}
        open={detailsItem !== null}
        onOpenChange={(open) => {
          if (!open) closeItemDetails()
        }}
      />
      <BasketSheet open={basketOpen} onOpenChange={setBasketOpen} config={config} />
      <LocationSheet open={locationOpen} onOpenChange={setLocationOpen} config={config} />
    </div>
  )
}
