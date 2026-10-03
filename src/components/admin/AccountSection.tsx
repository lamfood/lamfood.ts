"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  User,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch, ApiError } from "@/lib/api"

/* ------------------------------------------------------------------ */
/* Section card wrapper                                               */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Key
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-4 rounded-2xl py-5">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4.5" aria-hidden />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 sm:px-6">{children}</CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AccountSection({
  currentUsername,
  onUnauthorized,
}: {
  currentUsername: string
  onUnauthorized: () => void
}) {
  return (
    <div className="grid gap-4">
      <ChangePasswordCard onUnauthorized={onUnauthorized} />
      <ChangeUsernameCard currentUsername={currentUsername} onUnauthorized={onUnauthorized} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Change password                                                     */
/* ------------------------------------------------------------------ */

function ChangePasswordCard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Two-step confirmation dialog
  const [confirmStep1, setConfirmStep1] = useState(false)
  const [confirmStep2, setConfirmStep2] = useState(false)

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setConfirmStep1(true)
  }

  async function actuallyChangePassword() {
    setConfirmStep2(false)
    setSaving(true)
    try {
      await apiFetch<{ ok: boolean }>("/api/admin/account", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      toast.success("رمز عبور با موفقیت تغییر کرد")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "تغییر رمز عبور ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SectionCard icon={Key} title="تغییر رمز عبور">
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Current password */}
          <div className="grid gap-2">
            <Label htmlFor="current-password">رمز عبور فعلی</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                dir="ltr"
                className="h-11 pl-10 pr-10 text-left"
                placeholder="••••••••"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "پنهان کردن رمز" : "نمایش رمز"}
                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="grid gap-2">
            <Label htmlFor="new-password">رمز عبور جدید</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                dir="ltr"
                className="h-11 pl-10 pr-10 text-left"
                placeholder="حداقل ۸ کاراکتر"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "پنهان کردن رمز" : "نمایش رمز"}
                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showNew ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">تکرار رمز عبور جدید</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                dir="ltr"
                className="h-11 pl-10 pr-10 text-left"
                placeholder="تکرار رمز عبور جدید"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "پنهان کردن رمز" : "نمایش رمز"}
                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
              <p className="text-xs text-destructive">رمز عبور جدید و تکرار آن یکسان نیستند.</p>
            ) : null}
          </div>

          <Button type="submit" disabled={!canSubmit || saving} className="h-12 w-full font-bold">
            {saving ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                در حال تغییر…
              </>
            ) : (
              "تغییر رمز عبور"
            )}
          </Button>
        </form>
      </SectionCard>

      {/* Confirmation step 1 */}
      <AlertDialog open={confirmStep1} onOpenChange={(open) => { if (!open && !saving) setConfirmStep1(false) }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" aria-hidden />
              تایید تغییر رمز عبور
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید رمز عبور خود را تغییر دهید؟
              بعد از تغییر، باید با رمز عبور جدید وارد شوید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                setConfirmStep1(false)
                setConfirmStep2(true)
              }}
            >
              ادامه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation step 2 (final) */}
      <AlertDialog open={confirmStep2} onOpenChange={(open) => { if (!open && !saving) setConfirmStep2(false) }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
              تایید نهایی
            </AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات بازگشت‌پذیر نیست. آیا واقعاً می‌خواهید رمز عبور را تغییر دهید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault()
                void actuallyChangePassword()
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  در حال تغییر…
                </>
              ) : (
                "بله، رمز را تغییر بده"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Change username                                                     */
/* ------------------------------------------------------------------ */

function ChangeUsernameCard({
  currentUsername,
  onUnauthorized,
}: {
  currentUsername: string
  onUnauthorized: () => void
}) {
  const [newUsername, setNewUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSubmit = newUsername.trim().length >= 3 && newUsername.trim() !== currentUsername

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setConfirmOpen(true)
  }

  async function actuallyChangeUsername() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const data = await apiFetch<{ ok: boolean; username: string }>("/api/admin/account", {
        method: "POST",
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      })
      toast.success(`نام کاربری به «${data.username}» تغییر کرد`)
      setNewUsername("")
      // Force re-login since the session token is tied to the old username
      onUnauthorized()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "تغییر نام کاربری ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard icon={User} title="تغییر نام کاربری">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="current-username-display">نام کاربری فعلی</Label>
          <Input
            id="current-username-display"
            dir="ltr"
            className="h-11 text-left font-mono text-sm"
            value={currentUsername}
            disabled
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-username">نام کاربری جدید</Label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="new-username"
              dir="ltr"
              className="h-11 pl-10 text-left"
              placeholder="new_admin"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={saving}
              maxLength={40}
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط. حداقل ۳ کاراکتر.
          </p>
        </div>

        <Button type="submit" disabled={!canSubmit || saving} className="h-12 w-full font-bold">
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              در حال تغییر…
            </>
          ) : (
            "تغییر نام کاربری"
          )}
        </Button>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />
          بعد از تغییر نام کاربری، باید دوباره وارد شوید.
        </p>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open && !saving) setConfirmOpen(false) }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" aria-hidden />
              تایید تغییر نام کاربری
            </AlertDialogTitle>
            <AlertDialogDescription>
              نام کاربری از «{currentUsername}» به «{newUsername.trim()}» تغییر می‌کند.
              بعد از این، باید با نام کاربری جدید وارد شوید. ادامه می‌دهید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault()
                void actuallyChangeUsername()
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  در حال تغییر…
                </>
              ) : (
                "بله، تغییر بده"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
