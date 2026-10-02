"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { GripVertical, ImagePlus, Loader2, Link2, Plus, Trash2, X } from "lucide-react"
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
import type { ItemOptionGroupDTO, MenuItemDTO } from "@/lib/types"

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
  const [featured, setFeatured] = useState<boolean>(false)
  /** Admin-defined option groups (e.g. size, spice level). Empty = no options. */
  const [optionGroups, setOptionGroups] = useState<ItemOptionGroupDTO[]>([])
  /** Time-of-day availability window (HH:MM). Both null = always available. */
  const [availableFrom, setAvailableFrom] = useState<string>("")
  const [availableTo, setAvailableTo] = useState<string>("")
  /** Media library browser dialog open state. */
  const [mediaLibOpen, setMediaLibOpen] = useState<boolean>(false)

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
    setFeatured(initial?.featured ?? false)
    setOptionGroups(initial?.options ?? [])
    setAvailableFrom(initial?.availableFrom ?? "")
    setAvailableTo(initial?.availableTo ?? "")
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
        featured,
        sortOrder: initial?.sortOrder ?? 0,
        options: optionGroups,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="flex h-10 w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:h-8 sm:text-xs"
                >
                  <Link2 className="size-4 sm:size-3.5" aria-hidden />
                  یا وارد کردن آدرس تصویر
                </button>
                <button
                  type="button"
                  onClick={() => setMediaLibOpen(true)}
                  className="flex h-10 w-fit items-center gap-1 text-sm text-primary underline-offset-4 hover:underline sm:h-8 sm:text-xs"
                >
                  <ImagePlus className="size-4 sm:size-3.5" aria-hidden />
                  انتخاب از کتابخانه تصاویر
                </button>
              </div>
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
                  className="border-accent/50 bg-accent/15 font-bold text-accent-foreground"
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

          {/* Availability + Featured toggles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 sm:min-h-11">
              <Label htmlFor="item-available" className="cursor-pointer text-sm">
                نمایش در منو
              </Label>
              <Switch
                id="item-available"
                checked={available}
                onCheckedChange={(v) => setAvailable(v === true)}
                className="h-6 w-11 sm:h-[1.15rem] sm:w-8"
              />
            </div>
            <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 sm:min-h-11">
              <Label htmlFor="item-featured" className="cursor-pointer text-sm">
                پیشنهاد شف
              </Label>
              <Switch
                id="item-featured"
                checked={featured}
                onCheckedChange={(v) => setFeatured(v === true)}
                className="h-6 w-11 sm:h-[1.15rem] sm:w-8"
              />
            </div>
          </div>

          {/* Options / add-ons editor */}
          <OptionsEditor optionGroups={optionGroups} onChange={setOptionGroups} />

          {/* Time-of-day availability */}
          <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
            <Label className="text-sm font-bold">ساعت موجود بودن (اختیاری)</Label>
            <p className="text-xs text-muted-foreground">
              اگر خالی بگذارید، این آیتم همیشه موجود است. برای محدود کردن به ساعات خاص، ساعت شروع و پایان را وارد کنید.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="item-available-from" className="text-xs text-muted-foreground">از ساعت</Label>
                <Input
                  id="item-available-from"
                  type="time"
                  dir="ltr"
                  className="h-9 text-left text-sm"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="item-available-to" className="text-xs text-muted-foreground">تا ساعت</Label>
                <Input
                  id="item-available-to"
                  type="time"
                  dir="ltr"
                  className="h-9 text-left text-sm"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                />
              </div>
            </div>
            {availableFrom && availableTo ? (
              <button
                type="button"
                onClick={() => { setAvailableFrom(""); setAvailableTo("") }}
                className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                پاک کردن محدودیت ساعت
              </button>
            ) : null}
          </div>

          <Button type="submit" disabled={saving || uploading} className="h-14 w-full text-base font-bold sm:h-12">
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

      {/* Media library browser — lets the admin pick from existing uploads */}
      <MediaLibraryBrowser
        open={mediaLibOpen}
        onOpenChange={setMediaLibOpen}
        onPick={(url) => {
          setImage(url)
          setMediaLibOpen(false)
          toast.success("تصویر انتخاب شد")
        }}
        currentImage={image}
        onUnauthorized={onUnauthorized}
      />
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Options / add-ons editor                                             */
/* ------------------------------------------------------------------ */

/** Small id generator for new option groups + options. Not crypto-secure
 *  (it's a form-field key, not a security boundary). */
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function OptionsEditor({
  optionGroups,
  onChange,
}: {
  optionGroups: ItemOptionGroupDTO[]
  onChange: (groups: ItemOptionGroupDTO[]) => void
}) {
  function addGroup() {
    onChange([
      ...optionGroups,
      { id: genId("grp"), label: "", options: [{ id: genId("opt"), name: "", price: 0, isDefault: true }], multiSelect: false },
    ])
  }

  function removeGroup(groupIdx: number) {
    onChange(optionGroups.filter((_, i) => i !== groupIdx))
  }

  function updateGroupLabel(groupIdx: number, label: string) {
    onChange(
      optionGroups.map((g, i) => (i === groupIdx ? { ...g, label } : g)),
    )
  }

  /** Toggle a group between single-select (radio) and multi-select (checkbox).
   *  When switching to single-select, if multiple options have isDefault=true,
   *  keep only the first. */
  function toggleMultiSelect(groupIdx: number, multiSelect: boolean) {
    onChange(
      optionGroups.map((g, i) => {
        if (i !== groupIdx) return g
        if (!multiSelect) {
          // Switching to single-select: keep only the first default.
          let seenDefault = false
          return {
            ...g,
            multiSelect: false,
            options: g.options.map((o) => {
              if (o.isDefault && !seenDefault) {
                seenDefault = true
                return o
              }
              return { ...o, isDefault: false }
            }),
          }
        }
        return { ...g, multiSelect: true }
      }),
    )
  }

  function addOption(groupIdx: number) {
    onChange(
      optionGroups.map((g, i) =>
        i === groupIdx
          ? { ...g, options: [...g.options, { id: genId("opt"), name: "", price: 0, isDefault: false }] }
          : g,
      ),
    )
  }

  function removeOption(groupIdx: number, optIdx: number) {
    onChange(
      optionGroups.map((g, i) =>
        i === groupIdx
          ? { ...g, options: g.options.filter((_, j) => j !== optIdx) }
          : g,
      ),
    )
  }

  function updateOption(groupIdx: number, optIdx: number, patch: Partial<{ name: string; priceText: string; isDefault: boolean }>) {
    onChange(
      optionGroups.map((g, i) => {
        if (i !== groupIdx) return g
        return {
          ...g,
          options: g.options.map((o, j) => {
            if (j !== optIdx) return o
            const next = { ...o }
            if (patch.name !== undefined) next.name = patch.name
            if (patch.priceText !== undefined) {
              const n = Number(patch.priceText)
              next.price = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0
            }
            if (patch.isDefault !== undefined) next.isDefault = patch.isDefault
            return next
          }),
        }
      }),
    )
  }

  /** Toggle the isDefault flag on an option. For single-select groups
   *  (radio), only one option can be default at a time (radio behavior).
   *  For multiSelect groups, each option's isDefault is independent. */
  function toggleDefault(groupIdx: number, optIdx: number) {
    onChange(
      optionGroups.map((g, i) => {
        if (i !== groupIdx) return g
        if (g.multiSelect) {
          // Checkbox: toggle this option's default independently.
          return {
            ...g,
            options: g.options.map((o, j) =>
              j === optIdx ? { ...o, isDefault: !o.isDefault } : o,
            ),
          }
        }
        // Radio: exactly one default per group.
        return {
          ...g,
          options: g.options.map((o, j) => ({ ...o, isDefault: j === optIdx })),
        }
      }),
    )
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground/60" aria-hidden />
          <Label className="text-sm font-bold">گزینه‌های اضافی</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGroup}
          className="h-10 gap-1.5 px-3 text-sm sm:h-8 sm:px-2.5 sm:text-xs"
        >
          <Plus className="size-4 sm:size-3.5" aria-hidden />
          گروه جدید
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        گروهی از گزینه‌ها که مشتری باید انتخاب کند (مثل اندازه یا سطح تندی).
        برای افزودنی‌های اختیاری (مثل «پنیر اضافه»)، حالت چندانتخابی را فعال کنید.
      </p>

      {optionGroups.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
          <GripVertical className="size-4" aria-hidden />
          این آیتم گزینه‌ای ندارد — با «گروه جدید» اضافه کنید.
        </div>
      ) : (
        <div className="grid gap-3">
          {optionGroups.map((group, gi) => (
            <div key={group.id} className="grid gap-2 rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <Input
                  value={group.label}
                  onChange={(e) => updateGroupLabel(gi, e.target.value)}
                  placeholder="عنوان گروه (مثل: اندازه)"
                  className="h-11 min-w-0 flex-1 text-sm font-medium sm:h-9 sm:min-w-[8rem]"
                  aria-label={`عنوان گروه ${gi + 1}`}
                  maxLength={60}
                />
                {/* Multi-select toggle */}
                <label
                  className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 text-xs sm:h-9"
                  title={group.multiSelect ? "حالت چندانتخابی (چند گزینه قابل انتخاب)" : "حالت تک‌انتخابی (فقط یک گزینه)"}
                >
                  <Switch
                    checked={!!group.multiSelect}
                    onCheckedChange={(v) => toggleMultiSelect(gi, v === true)}
                    aria-label="چندانتخابی"
                    className="h-6 w-11 sm:h-[1.15rem] sm:w-8"
                  />
                  <span className="text-muted-foreground">چندانتخابی</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:size-9"
                  onClick={() => removeGroup(gi)}
                  aria-label="حذف این گروه"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>

              <div className="grid gap-2">
                {group.options.map((opt, oi) => (
                  <div key={opt.id} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                    {/* Default indicator: checkbox for multiSelect, radio for single-select */}
                    <input
                      type={group.multiSelect ? "checkbox" : "radio"}
                      name={`default-${group.id}`}
                      checked={opt.isDefault}
                      onChange={() => toggleDefault(gi, oi)}
                      aria-label={group.multiSelect ? "پیش‌فرض (پیش‌انتخاب شده)" : "پیش‌فرض این گروه"}
                      className="size-5 shrink-0 cursor-pointer accent-primary sm:size-4"
                    />
                    <Input
                      value={opt.name}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                      placeholder="نام گزینه (مثل: بزرگ)"
                      className="h-11 min-w-0 flex-1 text-sm sm:h-9 sm:min-w-[8rem]"
                      aria-label={`نام گزینه ${oi + 1}`}
                      maxLength={60}
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={opt.price === 0 ? "" : String(opt.price)}
                        onChange={(e) => updateOption(gi, oi, { priceText: e.target.value })}
                        placeholder="۰"
                        dir="ltr"
                        className="h-11 w-24 text-left text-sm sm:h-9 sm:w-20"
                        aria-label={`قیمت اضافه گزینه ${oi + 1} (هزار تومان)`}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">ه.ت</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:size-9"
                      onClick={() => removeOption(gi, oi)}
                      aria-label="حذف این گزینه"
                      disabled={group.options.length <= 1}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addOption(gi)}
                className="h-10 w-fit gap-1.5 text-sm text-primary hover:bg-primary/10 sm:h-8 sm:text-xs"
              >
                <Plus className="size-4 sm:size-3.5" aria-hidden />
                افزودن گزینه
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Media library browser                                               */
/* ------------------------------------------------------------------ */

interface MediaFile {
  url: string
  name: string
  size: number
  mtime: string
}

function MediaLibraryBrowser({
  open,
  onOpenChange,
  onPick,
  currentImage,
  onUnauthorized,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (url: string) => void
  currentImage: string | null
  onUnauthorized: () => void
}) {
  const [files, setFiles] = useState<MediaFile[] | null>(null)
  const [loadFailed, setLoadFailed] = useState<boolean>(false)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const data = await apiFetch<{ files: MediaFile[] }>("/api/admin/uploads")
      setFiles(data.files)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      setLoadFailed(true)
      setFiles([])
    }
  }, [onUnauthorized])

  // Load the file list when the dialog opens. Deferred to a microtask so
  // we're not calling setState synchronously in the effect body (keeps the
  // `react-hooks/set-state-in-effect` lint rule happy).
  useEffect(() => {
    if (!open) return
    queueMicrotask(() => void load())
  }, [open, load])

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nice-scrollbar max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>کتابخانه تصاویر</DialogTitle>
          <DialogDescription>
            یک تصویر از بین فایل‌های آپلودشده انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        {files === null ? (
          <div className="flex items-center justify-center py-12" role="status">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : loadFailed ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">دریافت فهرست تصاویر ناموفق بود.</p>
            <Button variant="outline" onClick={() => void load()} className="h-11">
              تلاش مجدد
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ImagePlus className="size-12 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              هنوز تصویری آپلود نشده است.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((f) => {
              const isSelected = currentImage === f.url
              return (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => onPick(f.url)}
                  className={`group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border p-1.5 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:shadow-sm"
                  }`}
                  aria-label={`انتخاب ${f.name}`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={f.url}
                      alt={f.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <p className="truncate text-[10px] font-medium text-muted-foreground" dir="ltr">
                    {f.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60">{formatSize(f.size)}</p>
                  {isSelected ? (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10">
            انصراف
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
