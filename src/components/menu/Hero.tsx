"use client"

import { useState } from "react"
import { Bike, ChefHat, Clock, Instagram, MapPin, Phone, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/menu/ThemeToggle"
import type { RestaurantConfig } from "@/lib/types"

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

/** Convert latin digits inside a string to Persian digits (for phones etc.). */
function toFaDigits(value: string): string {
  return value.replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

const chipClass =
  "inline-flex h-10 max-w-full items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm text-white backdrop-blur transition hover:bg-white/20"

interface HeroProps {
  config: RestaurantConfig
  /** null = not computed yet (pre-mount placeholder to avoid hydration mismatch). */
  isOpenNow: boolean | null
  onOpenLocation: () => void
}

export default function Hero({ config, isOpenNow, onOpenLocation }: HeroProps) {
  const [heroImageFailed, setHeroImageFailed] = useState(false)

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })
  }

  const hasHeroImage = Boolean(config.heroImage) && !heroImageFailed

  return (
    <header id="top" className="relative isolate overflow-hidden text-white">
      {/* Mobile-only floating theme toggle (top-left of hero, above the image) */}
      <div className="absolute left-3 top-3 z-20 sm:hidden">
        <ThemeToggle />
      </div>

      {hasHeroImage && (
        <img
          src={config.heroImage}
          alt={`فضای ${config.name}`}
          onError={() => setHeroImageFailed(true)}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden
        className={
          hasHeroImage
            ? "absolute inset-0 -z-10 bg-gradient-to-b from-primary/95 via-primary/85 to-primary/80 dark:from-black/85 dark:via-black/65 dark:to-black/80"
            : "absolute inset-0 -z-10 bg-gradient-to-b from-primary via-primary/90 to-primary/95 dark:from-primary/85 dark:via-primary/80 dark:to-primary/85"
        }
      />
      {/* Subtle texture grid overlay for depth — barely visible on photo, more
          noticeable on solid-color hero. Pure CSS so it costs nothing. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      {/* In dark mode: an extra scrim behind the text container so the food
          photography doesn't compete with the hero copy. Pure CSS, no perf
          cost. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-full bg-gradient-to-b from-black/30 via-transparent to-black/30 dark:block"
      />
      {/* Decorative accent blur circles for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center sm:py-20">
        {config.logo ? (
          <img
            src={config.logo}
            alt={`لوگوی ${config.name}`}
            className="h-20 w-20 rounded-full object-cover shadow-xl ring-4 ring-white/20 sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20 sm:h-24 sm:w-24">
            <ChefHat className="h-10 w-10 text-accent" aria-hidden />
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{config.name}</h1>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/70 sm:text-sm">
            {config.nameEn}
          </p>
        </div>

        {config.tagline && (
          <p className="text-lg font-bold text-accent sm:text-xl">{config.tagline}</p>
        )}

        {config.about && (
          <p className="max-w-2xl text-sm leading-7 text-white/80 line-clamp-3 sm:text-base">
            {config.about}
          </p>
        )}

        {/* Open / closed status — placeholder pre-mount to avoid hydration mismatch */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm">
          {isOpenNow === null ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 backdrop-blur">
              <Clock className="h-4 w-4" aria-hidden />
              {config.openTimeText}
            </span>
          ) : (
            <>
              <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 backdrop-blur">
                <span
                  className={`h-2 w-2 rounded-full ${isOpenNow ? "bg-emerald-400" : "bg-accent"}`}
                  aria-hidden
                />
                {isOpenNow ? "الان باز است" : "الان بسته است"}
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 backdrop-blur">
                <Clock className="h-4 w-4" aria-hidden />
                {config.openTimeText}
              </span>
            </>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={scrollToMenu}
            className="group h-12 rounded-full bg-accent px-6 text-base font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98]"
          >
            <UtensilsCrossed className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden />
            مشاهده منو
          </Button>
          {config.snappfood && (
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-white/40 bg-white/5 px-6 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white active:scale-[0.98]"
            >
              <a href={config.snappfood} target="_blank" rel="noopener noreferrer">
                <Bike className="h-5 w-5" aria-hidden />
                سفارش در اسنپ‌فود
              </a>
            </Button>
          )}
        </div>

        {/* Quick chips */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {config.phone && (
            <a href={`tel:${config.phone}`} className={chipClass}>
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <span dir="ltr">{toFaDigits(config.phone)}</span>
            </a>
          )}
          {config.address && (
            <button type="button" onClick={onOpenLocation} className={chipClass}>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="max-w-[15rem] truncate sm:max-w-xs">{config.address}</span>
            </button>
          )}
          {config.instagram && (
            <a
              href={config.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              <Instagram className="h-4 w-4 shrink-0" aria-hidden />
              اینستاگرام
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
