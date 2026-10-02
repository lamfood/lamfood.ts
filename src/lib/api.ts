"use client"

import { clearAdminToken, getAdminToken } from "@/lib/auth-client"

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

interface ErrorBody {
  message?: string
  error?: string
}

/** Small client-side fetch wrapper with consistent Persian error messages. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken()
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        // Signed session token for contexts where cookies are blocked
        // (sandboxed preview iframes). Cookie remains the primary path.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError("اتصال به سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.", 0, null)
  }

  const data = (await res.json().catch(() => null)) as ErrorBody | null

  if (!res.ok) {
    // Expired/invalid session → drop any stored token so the next probe is clean.
    if (res.status === 401) clearAdminToken()
    const message =
      data?.message ??
      (res.status === 401
        ? "نشست شما منقضی شده است؛ دوباره وارد شوید."
        : res.status === 429
          ? "تلاش بیش از حد؛ لطفاً کمی بعد دوباره امتحان کنید."
          : "خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید.")
    throw new ApiError(message, res.status, data)
  }

  return data as T
}

/** JSON body helper for POST/PUT requests. */
export function jsonBody(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) }
}
