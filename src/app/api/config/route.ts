import { NextResponse } from "next/server"
import { getPublicConfig } from "@/lib/config"

export const dynamic = "force-dynamic"

/** Public restaurant info from config.json (no admin secrets). */
export async function GET() {
  try {
    return NextResponse.json(getPublicConfig(), { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("GET /api/config failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت اطلاعات رستوران." },
      { status: 500 },
    )
  }
}
