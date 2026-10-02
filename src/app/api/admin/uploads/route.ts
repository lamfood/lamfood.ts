import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

/** Media library — lists all image files in public/uploads/ so the admin
 *  can pick an existing image instead of re-uploading. Admin only.
 *
 *  Returns { files: [{ url, name, size, mtime }] } sorted newest-first. */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const dir = path.join(process.cwd(), "public", "uploads")

  try {
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [] })
    }

    const entries = await fs.promises.readdir(dir)
    const imageExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]
    const files = await Promise.all(
      entries
        .filter((name) => imageExt.includes(path.extname(name).toLowerCase()))
        .map(async (name) => {
          const filePath = path.join(dir, name)
          const stat = await fs.promises.stat(filePath)
          return {
            url: `/uploads/${name}`,
            name,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          }
        }),
    )

    // Sort newest-first (most recently modified at the top).
    files.sort((a, b) => b.mtime.localeCompare(a.mtime))

    return NextResponse.json(
      { files },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("GET /api/admin/uploads failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در دریافت فهرست تصاویر." },
      { status: 500 },
    )
  }
}
