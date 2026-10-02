import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { assertSameOrigin, requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { CATEGORY_KEYS } from "@/lib/categories"
import { menuItemToDTO, parseOptionsJson } from "@/lib/menu-items"

const imageRe = /^(?:\/uploads\/[\w.-]+|https:\/\/[\w.-]+(?:\/[^\s]*)?)$/

/** Validation schema for a single option in an option group. */
const optionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1, "نام گزینه الزامی است").max(60),
  price: z.number().int().min(0).max(100_000).default(0),
  isDefault: z.boolean().default(false),
})

/** Validation schema for an option group (e.g. "size" with S/M/L options). */
const optionGroupSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1, "عنوان گروه گزینه‌ها الزامی است").max(60),
  options: z.array(optionSchema).min(1, "هر گروه حداقل یک گزینه باید داشته باشد").max(20),
})

/** Top-level options array on MenuItem. Empty array = no options. */
const optionsArraySchema = z.array(optionGroupSchema).max(10).default([])

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
  /** Admin-defined option groups. Validated + serialized to JSON for storage. */
  options: optionsArraySchema,
})

/** List ALL items (including unavailable) — admin only. */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req)
  if (unauthorized) return unauthorized

  const rows = await db.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  })
  const items = rows.map((r) => menuItemToDTO(r))
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

  // Serialize the options array to JSON for storage (SQLite has no array type).
  const { options, ...rest } = parsed.data
  const optionsJson = JSON.stringify(options)

  try {
    const item = await db.menuItem.create({
      data: { ...rest, optionsJson },
    })
    return NextResponse.json({ item: menuItemToDTO(item) }, { status: 201 })
  } catch (err) {
    console.error("POST /api/admin/items failed:", err)
    return NextResponse.json(
      { error: "server_error", message: "خطا در ثبت آیتم؛ دوباره تلاش کنید." },
      { status: 500 },
    )
  }
}
