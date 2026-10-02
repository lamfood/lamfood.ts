"use client"

import { motion } from "framer-motion"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { faNumber } from "@/lib/format"

export interface CategoryGridGroup {
  key: string
  label: string
  icon: LucideIcon
  count: number
}

interface CategoryGridProps {
  groups: CategoryGridGroup[]
  /** When true (search active), the grid is hidden to save space. */
  hidden?: boolean
  /** Scroll to a category section by key. */
  onSelect: (key: string) => void
}

/**
 * "View all categories at once" — a responsive grid of category cards that
 * complements the horizontal `StickyCategoryNav` chip rail. Each card shows the
 * category icon, label, and live item count; clicking scrolls to that section.
 *
 * The grid is hidden while the user is searching (the search results view
 * replaces the normal category sections).
 */
export default function CategoryGrid({
  groups,
  hidden = false,
  onSelect,
}: CategoryGridProps) {
  if (hidden || groups.length === 0) return null

  return (
    <section
      id="categories-overview"
      aria-labelledby="categories-overview-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-2 pt-8 sm:pt-10"
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="categories-overview-heading"
            className="text-xl font-extrabold sm:text-2xl"
          >
            دسته‌بندی‌ها
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            روی هر دسته بزن تا به آیتم‌های آن بخش بروی.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
          {faNumber(groups.length)} دسته
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {groups.map((group, index) => (
          <CategoryCard
            key={group.key}
            group={group}
            index={index}
            onSelect={() => onSelect(group.key)}
          />
        ))}
      </div>
    </section>
  )
}

function CategoryCard({
  group,
  index,
  onSelect,
}: {
  group: CategoryGridGroup
  index: number
  onSelect: () => void
}) {
  const Icon = group.icon
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 11) * 0.035, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`رفتن به دستهٔ ${group.label} — ${faNumber(group.count)} آیتم`}
      className="group/card relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-right shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Decorative accent corner glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-accent/15 transition-transform duration-300 group-hover/card:scale-150"
      />

      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover/card:bg-primary group-hover/card:text-primary-foreground">
        <Icon className="size-5" aria-hidden />
      </div>

      <div className="relative flex w-full items-center justify-between gap-2">
        <span className="line-clamp-1 text-sm font-bold leading-5">
          {group.label}
        </span>
        {group.count > 0 ? (
          <Badge variant="secondary" className="shrink-0 px-2 py-0 text-[11px]">
            {faNumber(group.count)}
          </Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">خالی</span>
        )}
      </div>

      <span className="relative mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover/card:text-primary">
        مشاهده
        <ArrowLeft className="size-3.5" aria-hidden />
      </span>
    </motion.button>
  )
}
