"use client"

import { Compass, Globe, MapPin, Navigation, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"
import type { RestaurantConfig } from "@/lib/types"

interface LocationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: RestaurantConfig
}

export default function LocationSheet({ open, onOpenChange, config }: LocationSheetProps) {
  const lat = config.location?.lat ?? 0
  const lng = config.location?.lng ?? 0
  const hasLocation = !(lat === 0 && lng === 0)

  const mapOptions = hasLocation
    ? [
        {
          label: "گوگل مپ",
          icon: MapPin,
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        },
        {
          label: "نشان",
          icon: Navigation,
          url: `https://neshan.org/maps/@${lat},${lng},17z`,
        },
        {
          label: "بلد",
          icon: Compass,
          url: `https://balad.ir/location?lat=${lat}&lng=${lng}&zoom=17`,
        },
        {
          label: "OpenStreetMap",
          icon: Globe,
          url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
        },
      ]
    : []

  const copyAddress = async () => {
    if (!config.address) {
      toast.error("آدرسی برای کپی کردن وجود ندارد.")
      return
    }
    try {
      await navigator.clipboard.writeText(config.address)
      toast.success("آدرس کپی شد")
    } catch {
      toast.error("کپی آدرس ناموفق بود.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="nice-scrollbar max-h-[85vh] gap-3 overflow-y-auto rounded-t-2xl"
      >
        <div className="mx-auto mt-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />

        <SheetHeader className="px-4 pb-0">
          <SheetTitle className="flex items-center gap-2 text-lg font-extrabold">
            <MapPin className="h-5 w-5 text-primary" aria-hidden />
            موقعیت روی نقشه
          </SheetTitle>
          <SheetDescription className="sr-only">
            آدرس رستوران و گزینه‌های مشاهده موقعیت در نقشه‌های مختلف
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <p className="flex-1 text-sm leading-6">
              {config.address || "آدرسی ثبت نشده است."}
            </p>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="کپی آدرس"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {hasLocation ? (
            <div className="grid gap-2">
              {mapOptions.map((option) => (
                <Button
                  key={option.label}
                  asChild
                  variant="outline"
                  className="h-12 justify-start gap-3 text-base"
                >
                  <a href={option.url} target="_blank" rel="noopener noreferrer">
                    <option.icon className="h-5 w-5 text-primary" aria-hidden />
                    {option.label}
                  </a>
                </Button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              موقعیتی ثبت نشده است.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
