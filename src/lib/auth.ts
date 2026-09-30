import "server-only"

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { readConfig } from "@/lib/config"

export const SESSION_COOKIE = "lamfood_admin"
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

/* ------------------------------------------------------------------ */
/* Stateless signed sessions (HMAC)                                    */
/* Next.js bundles each route separately, so in-memory Maps are NOT    */
/* reliably shared between routes — tokens are self-verifying instead. */
/* ------------------------------------------------------------------ */

export interface SessionInfo {
  ip: string
  expiresAt: number
}

/** Create a signed token: base64url(payload) + "." + base64url(HMAC-SHA256). */
export function createSessionToken(ip: string, secret: string): string {
  const payload = {
    ip,
    exp: Date.now() + SESSION_TTL_MS,
    jti: randomBytes(8).toString("hex"),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${sig}`
}

/** Verify signature + expiry; returns the session payload or null. */
export function verifySessionToken(token: string, secret: string): SessionInfo | null {
  try {
    const [body, sig] = token.split(".")
    if (!body || !sig) return null
    const expected = createHmac("sha256", secret).update(body).digest()
    const given = Buffer.from(sig, "base64url")
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as {
      ip?: string
      exp?: number
    }
    if (typeof payload.ip !== "string" || !payload.exp || payload.exp < Date.now()) return null
    return { ip: payload.ip, expiresAt: payload.exp }
  } catch {
    return null
  }
}

export function getSession(req: NextRequest): SessionInfo | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const secret = readConfig().sessionSecret
  if (!secret) return null
  return verifySessionToken(token, secret)
}

/** Stateless sessions are revoked by clearing the cookie (logout route). */
export function destroySession(_req: NextRequest): void {
  /* no server-side state to clear */
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false, // sandbox gateway terminates TLS; keep cookie usable over http previews
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  }
}

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, no external deps)                         */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split(":")
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, "hex")
    const hash = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length)
    return timingSafeEqual(hash, expected)
  } catch {
    return false
  }
}

/** Constant-time string compare (hash both sides first to equalize length). */
export function safeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

/* ------------------------------------------------------------------ */
/* Brute-force protection (per-IP, sliding window + lockout)           */
/* ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 min failure window
const LOCK_MS = 15 * 60 * 1000 // 15 min lockout

interface AttemptRecord {
  failures: number
  windowStart: number
  lockedUntil: number
}

const attempts = new Map<string, AttemptRecord>()
let lastAttemptCleanup = Date.now()

export function getLockState(ip: string): { locked: boolean; retryAfterSec: number } {
  const now = Date.now()
  if (now - lastAttemptCleanup > 5 * 60_000 && attempts.size > 1000) {
    lastAttemptCleanup = now
    for (const [ipKey, rec] of attempts) {
      if (rec.lockedUntil < now && now - rec.windowStart > WINDOW_MS) attempts.delete(ipKey)
    }
  }
  const rec = attempts.get(ip)
  if (!rec) return { locked: false, retryAfterSec: 0 }
  if (rec.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) }
  }
  return { locked: false, retryAfterSec: 0 }
}

export function registerFailure(ip: string): void {
  const now = Date.now()
  let rec = attempts.get(ip)
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rec = { failures: 0, windowStart: now, lockedUntil: 0 }
  }
  rec.failures += 1
  if (rec.failures >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCK_MS
    rec.failures = 0
    rec.windowStart = now
  }
  attempts.set(ip, rec)
}

export function clearFailures(ip: string): void {
  attempts.delete(ip)
}

/* ------------------------------------------------------------------ */
/* Request guards                                                      */
/* ------------------------------------------------------------------ */

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/** CSRF protection: for state-changing requests, Origin (when present) must match Host. */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin")
  if (!origin) return null // non-browser client (curl etc.) — still guarded by SameSite cookie
  const host = req.headers.get("host")
  try {
    if (!host || new URL(origin).host !== host) {
      return NextResponse.json(
        { error: "csrf_rejected", message: "درخواست نامعتبر است." },
        { status: 403 },
      )
    }
  } catch {
    return NextResponse.json(
      { error: "csrf_rejected", message: "درخواست نامعتبر است." },
      { status: 403 },
    )
  }
  return null
}

/** Returns a 401 response when there is no valid admin session, otherwise null. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const session = getSession(req)
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", message: "برای این عملیات باید وارد حساب مدیر شوید." },
      { status: 401 },
    )
  }
  return null
}

/** Small randomized delay to slow timing-based attacks on the login endpoint. */
export function randomDelay(minMs = 150, maxMs = 400): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, ms))
}
