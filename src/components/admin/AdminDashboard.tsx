"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { ChefHat, ExternalLink, LayoutDashboard, Loader2, LogOut, Package, Settings, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"

import DashboardStats from "@/components/admin/DashboardStats"
import ItemsManager from "@/components/admin/ItemsManager"
import OrdersManager from "@/components/admin/OrdersManager"
import SettingsForm from "@/components/admin/SettingsForm"
import ThemeToggle from "@/components/menu/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch, ApiError } from "@/lib/api"
import { clearAdminToken } from "@/lib/auth-client"
import { useNewOrders, notifyNewOrder } from "@/hooks/use-new-orders"
import { faNumber } from "@/lib/format"
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
  const [activeTab, setActiveTab] = useState<string>("items")

  // Poll for new orders every 30s. Toast on each newly-arrived order code.
  // (The hook skips polling when the tab is hidden — cheap on the server.)
  const newOrdersCount = useNewOrders({
    intervalMs: 30_000,
    onNew: (code) => {
      // Don't toast if the admin is already on the Orders tab — they'll
      // see the new card appear via the tab's own poll. Only toast when
      // they're elsewhere (items / settings) so they're alerted.
      if (activeTab !== "orders") {
        notifyNewOrder(code)
      }
    },
  })

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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-1 px-3 sm:h-16 sm:px-6">
          {/* Left: logo + name (hide badge on mobile) */}
          <div className="flex min-w-0 items-center gap-2">
            {logo ? (
              <img
                src={logo}
                alt={restaurantName || "لوگوی رستوران"}
                className="size-8 shrink-0 rounded-full object-cover sm:size-9"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-9">
                <ChefHat className="size-4 sm:size-5" aria-hidden />
              </div>
            )}
            <span className="truncate text-sm font-bold sm:text-base">
              {restaurantName || "پنل مدیریت"}
            </span>
            <Badge className="hidden shrink-0 sm:inline-flex">پنل مدیریت</Badge>
          </div>

          {/* Right: actions — compact icon-only on mobile, full with text on desktop */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="h-9 w-9 shrink-0 rounded-full p-0 sm:h-11 sm:w-auto sm:px-4">
              <Link href="/" aria-label="مشاهده منو">
                <ExternalLink className="size-4" aria-hidden />
                <span className="hidden sm:inline">مشاهده منو</span>
              </Link>
            </Button>
            <ThemeToggle className="h-9 w-9 shrink-0 rounded-full sm:h-11 sm:w-11" />
            <Button
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-full border-destructive/40 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-11 sm:w-auto sm:px-4"
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          defaultValue="dashboard"
          className="mt-4"
        >
          <TabsList className="no-scrollbar h-11 w-full gap-1 overflow-x-auto sm:h-10 sm:w-auto sm:overflow-visible">
            <TabsTrigger value="dashboard" className="gap-1.5 px-3 text-xs sm:gap-2 sm:px-4 sm:text-sm">
              <LayoutDashboard className="size-4" aria-hidden />
              <span className="hidden sm:inline">داشبورد</span>
              <span className="sm:hidden">داشبورد</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-1.5 px-3 text-xs sm:gap-2 sm:px-4 sm:text-sm">
              <UtensilsCrossed className="size-4" aria-hidden />
              <span className="hidden sm:inline">آیتم‌های منو</span>
              <span className="sm:hidden">آیتم‌ها</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 px-3 text-xs sm:gap-2 sm:px-4 sm:text-sm">
              <Package className="size-4" aria-hidden />
              <span className="hidden sm:inline">سفارش‌ها</span>
              <span className="sm:hidden">سفارش‌ها</span>
              {newOrdersCount > 0 ? (
                <Badge className="ms-1 h-5 min-w-5 animate-pulse rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground shadow-sm">
                  {faNumber(newOrdersCount)}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 px-3 text-xs sm:gap-2 sm:px-4 sm:text-sm">
              <Settings className="size-4" aria-hidden />
              <span className="hidden sm:inline">تنظیمات رستوران</span>
              <span className="sm:hidden">تنظیمات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <DashboardStats onUnauthorized={onUnauthorized} />
          </TabsContent>

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
