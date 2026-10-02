import { NextRequest, NextResponse } from "next/server"

import {
  assertSameOrigin,
  destroySession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth"

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  destroySession(req)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 })
  return res
}
