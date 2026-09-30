import { NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { readConfig } from "@/lib/config"

/** Lightweight session probe used by the admin page on load. */
export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  const cfg = readConfig()
  return NextResponse.json({ authenticated: true, username: cfg.admin.username })
}
