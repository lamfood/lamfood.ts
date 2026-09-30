import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

import { NextRequest, NextResponse } from "next/server"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

/** Magic-byte sniffing — never trust the client's declared content type. */
function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png"
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  )
    return "image/webp"
  return null
}

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

/** Secure image upload — admin only. Size limit + magic-byte check + randomized name. */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const form = await req.formData().catch(() => null)
  if (!form) {
    return NextResponse.json(
      { error: "bad_request", message: "درخواست نامعتبر است." },
      { status: 400 },
    )
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "bad_request", message: "فایلی ارسال نشده است." },
      { status: 400 },
    )
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "bad_request", message: "فایل خالی است." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "payload_too_large", message: "حجم تصویر باید کمتر از ۲ مگابایت باشد." },
      { status: 413 },
    )
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const mime = detectImageType(buf)
  if (!mime) {
    return NextResponse.json(
      { error: "unsupported_media_type", message: "فرمت تصویر معتبر نیست (JPG، PNG یا WebP)." },
      { status: 415 },
    )
  }

  const dir = path.join(process.cwd(), "public", "uploads")
  await fs.promises.mkdir(dir, { recursive: true })
  const filename = `${randomUUID()}${EXT[mime]}`
  await fs.promises.writeFile(path.join(dir, filename), buf)

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 })
}
