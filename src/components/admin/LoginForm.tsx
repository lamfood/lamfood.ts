"use client"

import { useEffect, useState } from "react"

import {
  AlertCircle,
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  TriangleAlert,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch, ApiError } from "@/lib/api"
import { saveAdminToken } from "@/lib/auth-client"
import { faNumber } from "@/lib/format"
import type { PublicConfigResponse } from "@/lib/types"

/** mm:ss countdown with Persian digits (e.g. «۱۴:۳۲»). */
function formatCountdown(totalSec: number): string {
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${faNumber(mm)}:${faNumber(ss).padStart(2, "۰")}`
}

type ErrorKind = "invalid" | "locked" | "network" | null

export default function LoginForm({
  onSuccess,
}: {
  onSuccess: (username: string) => void
}) {
  const [restaurantName, setRestaurantName] = useState<string>("")
  const [logo, setLogo] = useState<string | null>(null)

  const [username, setUsername] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const [pending, setPending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [lockSeconds, setLockSeconds] = useState<number>(0)

  // Fetch public restaurant info (name + logo) for the card header; silent on failure.
  useEffect(() => {
    let cancelled = false

    async function loadBranding() {
      try {
        const data = await apiFetch<PublicConfigResponse>("/api/config")
        if (cancelled) return
        setRestaurantName(data.restaurant.name)
        setLogo(data.restaurant.logo || null)
      } catch {
        // Branding is decorative — ignore failures.
      }
    }

    void loadBranding()

    return () => {
      cancelled = true
    }
  }, [])

  // Live countdown for the brute-force lockout window.
  useEffect(() => {
    if (lockSeconds <= 0) return
    const timer = setInterval(() => {
      setLockSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockSeconds])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending || lockSeconds > 0) return

    setPending(true)
    setError(null)
    setErrorKind(null)

    try {
      const data = await apiFetch<{ ok: boolean; username: string; token?: string }>(
        "/api/admin/login",
        {
          method: "POST",
          body: JSON.stringify({ username: username.trim(), password }),
        },
      )
      // Keep the signed token for contexts where cookies are blocked
      // (sandboxed preview iframes); normal browsers rely on the cookie.
      if (data.token) saveAdminToken(data.token)
      toast.success("خوش آمدید 👋")
      onSuccess(data.username)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const body = (err.data ?? null) as { retryAfterSec?: number } | null
          const secs =
            typeof body?.retryAfterSec === "number" && body.retryAfterSec > 0
              ? Math.ceil(body.retryAfterSec)
              : 60
          setLockSeconds(secs)
          setError(err.message)
          setErrorKind("locked")
        } else if (err.status === 0) {
          setError(err.message)
          setErrorKind("network")
        } else {
          setError(err.message)
          setErrorKind("invalid")
        }
      } else {
        setError("خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید.")
        setErrorKind("invalid")
      }
    } finally {
      setPending(false)
    }
  }

  const locked = lockSeconds > 0

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/90 p-4">
      {/* Decorative accent blur circles */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 size-72 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-10 size-80 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative flex w-full flex-col items-center">
        <Card className="w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 text-center">
              {logo ? (
                <img
                  src={logo}
                  alt={restaurantName || "لوگوی رستوران"}
                  className="size-16 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                  <ChefHat className="size-8" aria-hidden />
                </div>
              )}
              <div>
                {restaurantName ? (
                  <h1 className="text-lg font-black text-foreground">{restaurantName}</h1>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">ورود به پنل مدیریت</p>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="admin-username">نام کاربری</Label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="admin-username"
                    name="username"
                    type="text"
                    dir="ltr"
                    className="h-12 pl-10 text-left"
                    placeholder="admin"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (!locked) {
                        setError(null)
                        setErrorKind(null)
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-password">رمز عبور</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    className="h-12 pl-10 pr-12 text-left"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (!locked) {
                        setError(null)
                        setErrorKind(null)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {/* Error / lockout / network alerts */}
              {error && errorKind === "network" ? (
                <Alert className="border-accent/60 bg-accent/10 text-accent-foreground [&>svg]:text-current">
                  <TriangleAlert className="size-4" aria-hidden />
                  <AlertDescription className="text-current">{error}</AlertDescription>
                </Alert>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" aria-hidden />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={pending || locked}
                className="h-12 w-full text-base font-bold"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    ورود
                  </>
                ) : locked ? (
                  `تلاش مجدد تا ${formatCountdown(lockSeconds)}`
                ) : (
                  "ورود"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 max-w-md text-center text-xs leading-relaxed text-white/70">
          نام کاربری پیش‌فرض: admin — رمز پیش‌فرض: admin123 (حتماً بعد از راه‌اندازی با اسکریپت
          تغییر دهید)
        </p>
      </div>
    </div>
  )
}
