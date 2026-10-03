import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, requireAdmin, hashPassword, verifyPassword, getClientIp } from "@/lib/auth"
import { readConfig, updateAdminCredentials } from "@/lib/config"

export const dynamic = "force-dynamic"

const MIN_PASSWORD = 8
const MAX_PASSWORD = 128
const MIN_USERNAME = 3
const MAX_USERNAME = 40

/* ------------------------------------------------------------------ */
/* Password change                                                     */
/* ------------------------------------------------------------------ */

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است."),
  newPassword: z
    .string()
    .min(MIN_PASSWORD, `رمز عبور باید حداقل ${MIN_PASSWORD} کاراکتر باشد.`)
    .max(MAX_PASSWORD, `رمز عبور حداکثر ${MAX_PASSWORD} کاراکتر می‌تواند باشد.`),
  confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است."),
})

/** Change the admin password. Requires the current password, the new password,
 *  and a confirmation that the two new-password fields match. */
export async function PUT(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "اطلاعات نامعتبر است." },
      { status: 400 },
    )
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data

  // Check that new password != confirm
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "password_mismatch", message: "رمز عبور جدید و تکرار آن یکسان نیستند." },
      { status: 400 },
    )
  }

  // Verify the current password
  const config = readConfig()
  if (!config.admin.passwordHash) {
    return NextResponse.json(
      { error: "no_password", message: "رمز عبور فعلی تنظیم نشده است." },
      { status: 400 },
    )
  }

  if (!verifyPassword(currentPassword, config.admin.passwordHash)) {
    // Small delay to slow brute-force (defense-in-depth on top of the
    // login-endpoint brute-force protection).
    await new Promise((r) => setTimeout(r, 300))
    return NextResponse.json(
      { error: "wrong_password", message: "رمز عبور فعلی نادرست است." },
      { status: 403 },
    )
  }

  // Don't allow new password == current
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "same_password", message: "رمز عبور جدید باید با رمز فعلی متفاوت باشد." },
      { status: 400 },
    )
  }

  // Hash + persist
  const newHash = hashPassword(newPassword)
  updateAdminCredentials({ passwordHash: newHash })

  return NextResponse.json({ ok: true })
}

/* ------------------------------------------------------------------ */
/* Username change                                                     */
/* ------------------------------------------------------------------ */

const changeUsernameSchema = z.object({
  newUsername: z
    .string()
    .trim()
    .min(MIN_USERNAME, `نام کاربری باید حداقل ${MIN_USERNAME} کاراکتر باشد.`)
    .max(MAX_USERNAME, `نام کاربری حداکثر ${MAX_USERNAME} کاراکتر می‌تواند باشد.`)
    .regex(/^[a-zA-Z0-9_.-]+$/, "نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد."),
})

/** Change the admin username (not creating a new user — changing the existing
 *  one). No password required since the admin is already authenticated. */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const parsed = changeUsernameSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "اطلاعات نامعتبر است." },
      { status: 400 },
    )
  }

  const config = readConfig()
  if (parsed.data.newUsername === config.admin.username) {
    return NextResponse.json(
      { error: "same_username", message: "نام کاربری جدید باید با نام فعلی متفاوت باشد." },
      { status: 400 },
    )
  }

  updateAdminCredentials({ username: parsed.data.newUsername })

  return NextResponse.json({ ok: true, username: parsed.data.newUsername })
}

// Suppress unused import warnings
void getClientIp
