"use client";

import { ChefHat } from "lucide-react";
import { faNumber } from "@/lib/format";
import type { RestaurantConfig } from "@/lib/types";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(value: string): string {
  return value.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

interface MenuFooterProps {
  config: RestaurantConfig;
  className?: string;
}

export default function MenuFooter({ config, className }: MenuFooterProps) {
  const year = new Date().getFullYear();

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      className={`mt-auto bg-primary text-primary-foreground ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {config.logo ? (
              <img
                src={config.logo}
                alt={`لوگوی ${config.name}`}
                loading="lazy"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
                <ChefHat className="h-6 w-6 text-accent" aria-hidden />
              </div>
            )}
            <div>
              <p className="text-lg font-extrabold">{config.name}</p>
              {config.tagline && (
                <p className="text-sm text-white/70">{config.tagline}</p>
              )}
            </div>
          </div>

          <nav
            aria-label="لینک‌های سریع"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          >
            <button
              type="button"
              onClick={scrollToMenu}
              className="text-white/80 transition hover:text-accent"
            >
              مشاهده منو
            </button>
            {config.instagram && (
              <a
                href={config.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 transition hover:text-accent"
              >
                اینستاگرام
              </a>
            )}
            {config.snappfood && (
              <a
                href={config.snappfood}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 transition hover:text-accent"
              >
                اسنپ‌فود
              </a>
            )}
          </nav>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
          {config.phone && (
            <span>
              تلفن:{" "}
              <a
                href={`tel:${config.phone}`}
                dir="ltr"
                className="transition hover:text-white"
              >
                {toFaDigits(config.phone)}
              </a>
            </span>
          )}
          {config.address && <span>آدرس: {config.address}</span>}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 text-xs">
          <p suppressHydrationWarning>
            © {faNumber(year)} لم‌فود — تمامی حقوق محفوظ است.
          </p>
          <a
            href="/admin"
            className="text-white/40 transition hover:text-white/80"
          >
            پنل مدیریت
          </a>
        </div>
      </div>
    </footer>
  );
}
