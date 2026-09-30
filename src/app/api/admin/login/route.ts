import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  assertSameOrigin,
  clearFailures,
  createSessionToken,
  getClientIp,
  getLockState,
  randomDelay,
  registerFailure,
  safeEqualStr,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth"
import { readConfig } from "@/lib/config"

const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است").max(100),
  password: z.string().min(1, "رمز عبور الزامی است").max(200),
})

/**
 * Admin login.
 * Security: CSRF origin check → per-IP lockout (5 fails / 15 min ⇒ 15 min lock)
 * → randomized delay → constant-time credential compare → HttpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const ip = getClientIp(req)

  const lock = getLockState(ip)
  if (lock.locked) {
    const minutes = Math.max(1, Math.ceil(lock.retryAfterSec / 60))
    const faMinutes = String(minutes).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `تلاش‌های ناموفق بیش از حد مجاز بوده است. لطفاً ${faMinutes} دقیقه دیگر دوباره تلاش کنید.`,
        retryAfterSec: lock.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSec) } },
    )
  }

  // Slow down guessing without revealing why.
  await randomDelay()

  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", message: "نام کاربری و رمز عبور را وارد کنید." },
      { status: 400 },
    )
  }

  const cfg = readConfig()
  const userOk = safeEqualStr(parsed.data.username.trim(), cfg.admin.username)
  const passOk = cfg.admin.passwordHash
    ? verifyPassword(parsed.data.password, cfg.admin.passwordHash)
    : false

  if (!(userOk && passOk)) {
    registerFailure(ip)
    // Generic message: never reveal which field was wrong.
    return NextResponse.json(
      { error: "invalid_credentials", message: "نام کاربری یا رمز عبور اشتباه است." },
      { status: 401 },
    )
  }

  clearFailures(ip)
  if (!cfg.sessionSecret) {
    return NextResponse.json(
      { error: "server_error", message: "خطای پیکربندی سرور؛ sessionSecret تنظیم نشده است." },
      { status: 500 },
    )
  }
  const token = createSessionToken(ip, cfg.sessionSecret)
  const res = NextResponse.json({ ok: true, username: cfg.admin.username, token })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return res
}
