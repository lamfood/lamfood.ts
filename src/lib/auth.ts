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

/**
 * Resolve the admin session from either:
 * 1. `Authorization: Bearer <token>` — used when cookies are unavailable
 *    (e.g. sandboxed preview iframes block them). localStorage is origin-scoped,
 *    so tokens can only be attached by JS running on this app's own origin.
 * 2. The HttpOnly session cookie (primary path for normal browsers).
 */
export function getSession(req: NextRequest): SessionInfo | null {
  const secret = readConfig().sessionSecret
  if (!secret) return null

  const authHeader = req.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const bearerSession = verifySessionToken(token, secret)
      if (bearerSession) return bearerSession
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
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

/* ------------------------------------------------------------------ */
/* CSRF protection (defence-in-depth on top of SameSite=Lax cookies)   */
/* ------------------------------------------------------------------ */

/** Hosts this deployment is reached through: direct Host + forwarded hosts
 *  (tunnels/proxies may rewrite `Host` but forward the public one). */
function collectHostCandidates(req: NextRequest): Set<string> {
  const hosts = new Set<string>()
  const push = (raw: string | null | undefined) => {
    const v = raw?.trim().toLowerCase()
    if (v) hosts.add(v)
  }
  push(req.headers.get("host"))
  const forwarded = req.headers.get("x-forwarded-host")
  if (forwarded) for (const part of forwarded.split(",")) push(part)
  return hosts
}

function urlHost(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase() || null
  } catch {
    return null
  }
}

function csrfRejection(): NextResponse {
  return NextResponse.json(
    { error: "csrf_rejected", message: "درخواست نامعتبر است." },
    { status: 403 },
  )
}

/**
 * `Sec-Fetch-Site` is browser-controlled fetch metadata (a forbidden header
 * name — page JS can never set it). Modern browsers always send it on
 * cross-site requests; older browsers and non-browser clients omit it.
 */
function isSelfInitiatedRequest(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site")?.trim().toLowerCase()
  return !site || site === "same-origin"
}

/**
 * CSRF protection for state-changing requests. Rules:
 * - No Origin header → non-browser/legacy client; SameSite cookies still guard
 *   (a modern browser always sends Origin on cross-site POSTs, so an explicit
 *   cross-site signal is rejected even here).
 * - Origin "null" (sandboxed iframe / privacy webview) → allowed only with the
 *   unforgeable same-origin fetch-metadata signal (attackers can produce
 *   "null" origins too). Session APIs stay gated regardless: cross-site
 *   requests carry no SameSite=Lax cookie and cannot attach the Bearer token.
 * - Otherwise Origin must refer to a host this deployment is served from
 *   (Host / X-Forwarded-Host), or — behind tunnels that rewrite both — match
 *   the browser-controlled Referer AND be same-origin-initiated.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const reject = (detail: Record<string, unknown>) => {
    console.error("[csrf] rejected request:", JSON.stringify(detail))
    return csrfRejection()
  }

  const origin = req.headers.get("origin")
  const fetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase()

  if (!origin) {
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
      return reject({ origin, fetchSite, path: req.nextUrl?.pathname })
    }
    return null // non-browser client (curl etc.) — still guarded by SameSite cookie
  }

  const trimmed = origin.trim()
  if (trimmed.toLowerCase() === "null") {
    // Opaque origin — cannot be combined with session cookies; only trust it
    // when the browser itself says the request is same-origin initiated.
    if (isSelfInitiatedRequest(req)) return null
    return reject({ origin, fetchSite, path: req.nextUrl?.pathname })
  }

  const originHost = urlHost(trimmed)
  if (originHost) {
    if (collectHostCandidates(req).has(originHost)) return null

    // Tunnel rewrote Host and sent no X-Forwarded-Host: accept requests whose
    // Origin and Referer agree AND which the browser marks same-origin
    // initiated (both fields are browser-controlled, unforgeable by pages).
    const refererHost = urlHost(req.headers.get("referer") ?? "")
    if (refererHost && refererHost === originHost && isSelfInitiatedRequest(req)) return null
  }

  return reject({
    origin,
    referer: req.headers.get("referer"),
    host: req.headers.get("host"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    fetchSite,
    path: req.nextUrl?.pathname,
  })
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
