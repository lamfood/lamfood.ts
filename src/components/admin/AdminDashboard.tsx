"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { ChefHat, ExternalLink, Loader2, LogOut, Package, Settings, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"

import ItemsManager from "@/components/admin/ItemsManager"
import OrdersManager from "@/components/admin/OrdersManager"
import SettingsForm from "@/components/admin/SettingsForm"
import ThemeToggle from "@/components/menu/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch, ApiError } from "@/lib/api"
import { clearAdminToken } from "@/lib/auth-client"
import type { PublicConfigResponse } from "@/lib/types"

export default function AdminDashboard({
  username,
  onUnauthorized,
}: {
  username: string
  onUnauthorized: () => void
}) {
  const [restaurantName, setRestaurantName] = useState<string>("")
  const [logo, setLogo] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState<boolean>(false)

  // Public branding for the header (silent on failure).
  useEffect(() => {
    let cancelled = false

    async function loadBranding() {
      try {
        const data = await apiFetch<PublicConfigResponse>("/api/config")
        if (cancelled) return
        setRestaurantName(data.restaurant.name)
        setLogo(data.restaurant.logo || null)
      } catch {
        // Decorative — ignore.
      }
    }

    void loadBranding()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    clearAdminToken() // drop the stored session token (cookie is cleared server-side)
    try {
      await apiFetch<{ ok: boolean }>("/api/admin/logout", { method: "POST" })
      toast.success("خارج شدید")
      onUnauthorized()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session already gone — treat as logged out.
        toast.success("خارج شدید")
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "خروج ناموفق بود؛ دوباره تلاش کنید.")
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {logo ? (
              <img
                src={logo}
                alt={restaurantName || "لوگوی رستوران"}
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ChefHat className="size-5" aria-hidden />
              </div>
            )}
            <span className="truncate text-sm font-bold sm:text-base">
              {restaurantName || "پنل مدیریت"}
            </span>
            <Badge className="shrink-0">پنل مدیریت</Badge>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="h-11">
              <Link href="/">
                <ExternalLink className="size-4" aria-hidden />
                <span className="hidden sm:inline">مشاهده منو</span>
              </Link>
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              aria-label="خروج"
            >
              {loggingOut ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogOut className="size-4" aria-hidden />
              )}
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          خوش آمدید، <span className="font-medium text-foreground">{username}</span>
        </p>

        <Tabs defaultValue="items" className="mt-4">
          <TabsList className="h-11 w-full sm:h-10 sm:w-auto">
            <TabsTrigger value="items" className="gap-2 px-4 text-sm">
              <UtensilsCrossed className="size-4" aria-hidden />
              آیتم‌های منو
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 px-4 text-sm">
              <Package className="size-4" aria-hidden />
              سفارش‌ها
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 px-4 text-sm">
              <Settings className="size-4" aria-hidden />
              تنظیمات رستوران
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <ItemsManager onUnauthorized={onUnauthorized} />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <OrdersManager onUnauthorized={onUnauthorized} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SettingsForm onUnauthorized={onUnauthorized} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
