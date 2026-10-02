import { NextRequest, NextResponse } from "next/server"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"
import { getPublicConfig, updateRestaurantConfig } from "@/lib/config"

/** Read full restaurant config — admin only. */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  return NextResponse.json(getPublicConfig())
}

/** Update restaurant info in config.json — admin only. */
export async function PUT(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  try {
    const restaurant = updateRestaurantConfig(body)
    return NextResponse.json({ restaurant })
  } catch (err) {
    const message = err instanceof Error ? err.message : "اطلاعات نامعتبر است."
    return NextResponse.json({ error: "validation_error", message }, { status: 400 })
  }
}
