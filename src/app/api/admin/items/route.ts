import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { CATEGORY_KEYS } from "@/lib/categories"

const imageRe = /^(?:\/uploads\/[\w.-]+|https:\/\/[\w.-]+(?:\/[^\s]*)?)$/

export const itemCreateSchema = z.object({
  name: z.string().trim().min(1, "نام آیتم الزامی است").max(80, "نام حداکثر ۸۰ کاراکتر است"),
  description: z
    .string()
    .trim()
    .max(500, "توضیحات حداکثر ۵۰۰ کاراکتر است")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  price: z
    .number({ message: "قیمت باید عدد باشد" })
    .int("قیمت باید عدد صحیح باشد")
    .min(0, "قیمت نمی‌تواند منفی باشد")
    .max(100_000, "قیمت بیش از حد مجاز است"),
  category: z.string().refine((k) => CATEGORY_KEYS.includes(k), "دسته‌بندی نامعتبر است"),
  image: z
    .string()
    .trim()
    .max(500, "آدرس تصویر بیش از حد طولانی است")
    .refine(
      (v) => v === "" || imageRe.test(v),
      "آدرس تصویر نامعتبر است (فقط /uploads/… یا https://…)",
    )
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
})

/** List ALL items (including unavailable) — admin only. */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const items = await db.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ items })
}

/** Create an item — admin only. */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const parsed = itemCreateSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: "validation_error", message: first?.message ?? "اطلاعات نامعتبر است." },
      { status: 400 },
    )
  }

  try {
    const item = await db.menuItem.create({ data: parsed.data })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error("POST /api/admin/items failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در ثبت آیتم؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}
