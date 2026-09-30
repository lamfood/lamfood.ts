"use client"

import { useEffect, useRef, useState } from "react"

import { ImagePlus, Loader2, Link2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, ApiError } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { faNumber, formatPrice } from "@/lib/format"
import type { MenuItemDTO } from "@/lib/types"

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // 2 MB

function parsePrice(text: string): number {
  const trimmed = text.trim()
  if (trimmed === "") return Number.NaN
  return Number(trimmed)
}

export default function ItemForm({
  open,
  onOpenChange,
  initial,
  onSaved,
  onUnauthorized,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: MenuItemDTO | null
  onSaved: () => void
  onUnauthorized: () => void
}) {
  const [name, setName] = useState<string>("")
  const [priceText, setPriceText] = useState<string>("")
  const [category, setCategory] = useState<string>(CATEGORIES[0].key)
  const [description, setDescription] = useState<string>("")
  const [image, setImage] = useState<string | null>(null)
  const [available, setAvailable] = useState<boolean>(true)

  const [uploading, setUploading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset fields each time the dialog opens for a given item (or for create mode).
  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setPriceText(initial ? String(initial.price) : "")
    setCategory(initial?.category ?? CATEGORIES[0].key)
    setDescription(initial?.description ?? "")
    setImage(initial?.image ?? null)
    setAvailable(initial?.available ?? true)
    setShowUrlInput(false)
    setUploading(false)
    setSaving(false)
  }, [open, initial])

  async function handleFileSelected(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("حجم تصویر باید کمتر از ۲ مگابایت باشد.")
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const data = await apiFetch<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body: form,
      })
      setImage(data.url)
      toast.success("تصویر آپلود شد")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    if (trimmedName === "") {
      toast.error("نام آیتم الزامی است.")
      return
    }

    const price = parsePrice(priceText)
    if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
      toast.error("قیمت باید عددی صحیح و بزرگ‌تر یا مساوی صفر باشد.")
      return
    }

    const trimmedDescription = description.trim()
    const trimmedImage = image?.trim() ?? ""

    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : null,
        price,
        category,
        image: trimmedImage ? trimmedImage : null,
        available,
        sortOrder: initial?.sortOrder ?? 0,
      }

      if (initial) {
        await apiFetch<{ item: MenuItemDTO }>(`/api/admin/items/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch<{ item: MenuItemDTO }>("/api/admin/items", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      toast.success("آیتم ذخیره شد")
      onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "ذخیره آیتم ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  const priceValue = parsePrice(priceText)
  const priceValid = Number.isFinite(priceValue) && priceValue >= 0
  const isEdit = initial !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nice-scrollbar max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{isEdit ? "ویرایش آیتم" : "افزودن آیتم جدید"}</DialogTitle>
          <DialogDescription>اطلاعات آیتم را تکمیل کنید.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Image upload */}
          <div className="grid gap-2">
            <Label htmlFor="item-image">تصویر آیتم</Label>
            <input
              ref={fileInputRef}
              id="item-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileSelected(file)
                e.target.value = ""
              }}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || saving}
                className="relative flex h-32 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {image ? (
                  <img
                    src={image}
                    alt="پیش‌نمایش تصویر آیتم"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : uploading ? (
                  <>
                    <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                    <span className="text-sm font-medium">در حال آپلود…</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-7" aria-hidden />
                    <span className="px-4 text-sm font-medium">
                      انتخاب تصویر (JPG، PNG، WebP — حداکثر ۲ مگابایت)
                    </span>
                  </>
                )}
              </button>
              {image && !uploading ? (
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label="حذف تصویر"
                  className="absolute left-2 top-2 z-10 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>

            {/* Optional URL input */}
            {showUrlInput ? (
              <Input
                dir="ltr"
                className="h-11 text-left text-xs"
                placeholder="/uploads/photo.jpg یا https://example.com/photo.jpg"
                value={image ?? ""}
                onChange={(e) => setImage(e.target.value === "" ? null : e.target.value)}
                aria-label="آدرس تصویر"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="flex h-8 w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <Link2 className="size-3.5" aria-hidden />
                یا وارد کردن آدرس تصویر (اختیاری)
              </button>
            )}
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="item-name">نام آیتم</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="h-11"
            />
          </div>

          {/* Price */}
          <div className="grid gap-2">
            <Label htmlFor="item-price">قیمت (هزار تومان)</Label>
            <Input
              id="item-price"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              dir="ltr"
              className="h-11 text-left"
              placeholder="250"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
            />
            {priceValid ? (
              <div>
                <Badge
                  variant="outline"
                  className="border-[#faa916]/50 bg-accent/15 font-bold text-[#8a5b00]"
                >
                  نمایش در منو: {formatPrice(priceValue)}
                </Badge>
              </div>
            ) : null}
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="item-category">دسته‌بندی</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="item-category" className="h-11 w-full">
                <SelectValue placeholder="انتخاب دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    <span className="flex items-center gap-2">
                      <c.icon className="size-4 text-muted-foreground" aria-hidden />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="item-description">توضیحات (اختیاری)</Label>
              <span className="text-xs text-muted-foreground">
                {faNumber(description.length)}/۵۰۰
              </span>
            </div>
            <Textarea
              id="item-description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Availability */}
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3">
            <Label htmlFor="item-available" className="cursor-pointer text-sm">
              نمایش در منو
            </Label>
            <Switch
              id="item-available"
              checked={available}
              onCheckedChange={(v) => setAvailable(v === true)}
            />
          </div>

          <Button type="submit" disabled={saving || uploading} className="h-12 w-full font-bold">
            {saving ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                در حال ذخیره…
              </>
            ) : (
              "ذخیره آیتم"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
