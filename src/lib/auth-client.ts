"use client"

const TOKEN_KEY = "lamfood_admin_token"

/**
 * Signed admin session token storage.
 *
 * Some embedded contexts (e.g. sandboxed preview iframes) block cookies
 * entirely, which would make a cookie-only admin session unusable. The token
 * is the same HMAC-signed session the server issues in the HttpOnly cookie —
 * storing it in localStorage (origin-scoped, unreadable by other sites) lets
 * `apiFetch` send `Authorization: Bearer <token>` in those contexts.
 */
export function saveAdminToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable (private mode etc.) — cookie fallback still applies */
  }
}

export function getAdminToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearAdminToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
