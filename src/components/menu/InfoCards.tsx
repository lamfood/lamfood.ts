"use client";

import { Bike, Clock, Instagram, Info, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RestaurantConfig } from "@/lib/types";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(value: string): string {
  return value.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isOpen
          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700"
          : "border-amber-600/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-amber-500"}`}
        aria-hidden
      />
      {isOpen ? "الان باز است" : "الان بسته است"}
    </span>
  );
}

function CardIcon({ icon: Icon }: { icon: typeof Clock }) {
  return (
    <div className="w-fit rounded-xl bg-primary/10 p-2.5 text-primary">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
  );
}

interface InfoCardsProps {
  config: RestaurantConfig;
  /** null = not computed yet (pre-mount) */
  isOpenNow: boolean | null;
  onOpenLocation: () => void;
}

export default function InfoCards({
  config,
  isOpenNow,
  onOpenLocation,
}: InfoCardsProps) {
  return (
    <section
      id="info"
      aria-labelledby="info-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-2 pt-8 sm:pt-10"
    >
      <h2 id="info-heading" className="mb-4 text-xl font-extrabold sm:text-2xl">
        اطلاعات رستوران
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ساعات کاری */}
        <Card className="gap-3 p-5">
          <CardIcon icon={Clock} />
          <h3 className="font-bold">ساعت کاری</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {config.openTimeText}
          </p>
          {isOpenNow !== null && <OpenBadge isOpen={isOpenNow} />}
        </Card>

        {/* تلفن */}
        {config.phone && (
          <Card className="gap-3 p-5">
            <CardIcon icon={Phone} />
            <h3 className="font-bold">تلفن</h3>
            <p className="text-sm text-muted-foreground">
              برای سفارش تلفنی با ما تماس بگیرید.
            </p>
            <Button
              asChild
              variant="secondary"
              className="h-10 w-fit rounded-full px-4"
            >
              <a href={`tel:${config.phone}`}>
                <Phone className="h-4 w-4" aria-hidden />
                <span dir="ltr">{toFaDigits(config.phone)}</span>
              </a>
            </Button>
          </Card>
        )}

        {/* آدرس */}
        {config.address && (
          <Card className="gap-3 p-5">
            <CardIcon icon={MapPin} />
            <h3 className="font-bold">آدرس</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {config.address}
            </p>
            <Button
              variant="outline"
              className="h-10 w-fit rounded-full px-4"
              onClick={onOpenLocation}
            >
              <MapPin className="h-4 w-4" aria-hidden />
              مشاهده روی نقشه
            </Button>
          </Card>
        )}

        {/* اینستاگرام */}
        {config.instagram && (
          <Card className="gap-3 p-5">
            <CardIcon icon={Instagram} />
            <h3 className="font-bold">اینستاگرام</h3>
            <p className="text-sm text-muted-foreground">
              ما را در اینستاگرام دنبال کنید.
            </p>
            <Button
              asChild
              variant="secondary"
              className="h-10 w-fit rounded-full px-4"
            >
              <a
                href={config.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-4 w-4" aria-hidden />
                مشاهده پیج
              </a>
            </Button>
          </Card>
        )}

        {/* اسنپ‌فود */}
        {config.snappfood && (
          <Card className="gap-3 p-5">
            <CardIcon icon={Bike} />
            <h3 className="font-bold">اسنپ‌فود</h3>
            <p className="text-sm text-muted-foreground">
              سفارش آنلاین با تحویل سریع پیک اسنپ‌فود.
            </p>
            <Button
              asChild
              variant="secondary"
              className="h-10 w-fit rounded-full px-4"
            >
              <a
                href={config.snappfood}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Bike className="h-4 w-4" aria-hidden />
                سفارش آنلاین
              </a>
            </Button>
          </Card>
        )}

        {/* درباره ما */}
        {config.about && (
          <Card className="gap-3 p-5 sm:col-span-2 lg:col-span-1">
            <CardIcon icon={Info} />
            <h3 className="font-bold">درباره ما</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              {config.about}
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
