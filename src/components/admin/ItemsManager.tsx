"use client"

import { useCallback, useEffect, useState } from "react"

import {
  ChefHat,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import ItemForm from "@/components/admin/ItemForm"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { apiFetch, ApiError } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { faNumber, formatPrice } from "@/lib/format"
import type { MenuResponse, MenuItemDTO } from "@/lib/types"

const CATEGORIES_ICON: Record<string, (typeof CATEGORIES)[number]["icon"]> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.icon]),
)

function CategoryBadge({ category }: { category: string }) {
  const Icon = CATEGORIES_ICON[category]
  return (
    <Badge variant="secondary" className="shrink-0 gap-1 py-1">
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {categoryLabel(category)}
    </Badge>
  )
}

export default function ItemsManager({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [items, setItems] = useState<MenuItemDTO[] | null>(null)
  const [loadFailed, setLoadFailed] = useState<boolean>(false)
  const [search, setSearch] = useState<string>("")

  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<MenuItemDTO | null>(null)

  const [deleting, setDeleting] = useState<MenuItemDTO | null>(null)
  const [deletePending, setDeletePending] = useState<boolean>(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const data = await apiFetch<MenuResponse>("/api/admin/items")
      setItems(data.items)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      setLoadFailed(true)
      setItems((prev) => (prev === null ? [] : prev))
      toast.error(err instanceof Error ? err.message : "خطا در دریافت آیتم‌ها")
    }
  }, [onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  const query = search.trim().toLowerCase()
  const filtered =
    items === null
      ? []
      : query
        ? items.filter((i) => i.name.toLowerCase().includes(query))
        : items

  async function toggleAvailable(item: MenuItemDTO, available: boolean) {
    if (togglingId) return
    setTogglingId(item.id)
    try {
      await apiFetch<{ item: MenuItemDTO }>(`/api/admin/items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          available,
          sortOrder: item.sortOrder,
        }),
      })
      setItems((prev) =>
        prev ? prev.map((i) => (i.id === item.id ? { ...i, available } : i)) : prev,
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "تغییر وضعیت ناموفق بود")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleting || deletePending) return
    setDeletePending(true)
    try {
      await apiFetch<{ ok: boolean }>(`/api/admin/items/${deleting.id}`, { method: "DELETE" })
      toast.success("آیتم حذف شد")
      const removedId = deleting.id
      setDeleting(null)
      setItems((prev) => (prev ? prev.filter((i) => i.id !== removedId) : prev))
      void load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized()
        return
      }
      toast.error(err instanceof Error ? err.message : "حذف آیتم ناموفق بود")
    } finally {
      setDeletePending(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item: MenuItemDTO) {
    setEditing(item)
    setFormOpen(true)
  }

  // Loading skeleton
  if (items === null) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">در حال بارگذاری آیتم‌ها…</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Badge variant="secondary" className="h-8 shrink-0 px-3 text-sm">
            {faNumber(filtered.length)} آیتم
          </Badge>
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی آیتم…"
              aria-label="جستجوی آیتم"
              className="h-11 pr-9"
            />
          </div>
        </div>
        <Button onClick={openCreate} className="h-11 font-bold">
          <Plus className="size-4" aria-hidden />
          افزودن آیتم
        </Button>
      </div>

      {/* Load failure retry */}
      {loadFailed ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">دریافت آیتم‌ها ناموفق بود.</p>
          <Button variant="outline" onClick={() => void load()} className="h-11">
            تلاش مجدد
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-14 text-center">
          <ChefHat className="size-16 text-muted-foreground/40" aria-hidden />
          <p className="font-medium text-muted-foreground">
            {query ? "آیتمی با این نام پیدا نشد." : "هنوز آیتمی اضافه نشده است"}
          </p>
          {!query ? (
            <Button onClick={openCreate} className="h-11 font-bold">
              <Plus className="size-4" aria-hidden />
              افزودن آیتم
            </Button>
          ) : null}
        </div>
      ) : (
        /* Items grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const toggling = togglingId === item.id
            return (
              <Card key={item.id} className="gap-3 rounded-2xl py-4">
                <CardContent className="grid gap-3 px-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`h-32 w-full rounded-xl object-cover ${item.available ? "" : "opacity-60"}`}
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-xl bg-muted">
                      <ImagePlus className="size-8 text-muted-foreground/50" aria-hidden />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 font-bold leading-6 line-clamp-1">
                      {item.name}
                    </h3>
                    <CategoryBadge category={item.category} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-[#8a5b00]">
                      {formatPrice(item.price)}
                    </span>
                    {!item.available ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        غیرفعال
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-muted/50 px-3">
                    <Label
                      htmlFor={`avail-${item.id}`}
                      className="cursor-pointer text-xs text-muted-foreground"
                    >
                      فعال در منو
                      {toggling ? (
                        <Loader2 className="mr-1 inline size-3.5 animate-spin align-middle" aria-hidden />
                      ) : null}
                    </Label>
                    <Switch
                      id={`avail-${item.id}`}
                      checked={item.available}
                      disabled={toggling}
                      onCheckedChange={(v) => void toggleAvailable(item, v === true)}
                      aria-label={`فعال در منو: ${item.name}`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(item)}
                      aria-label={`ویرایش ${item.name}`}
                      title="ویرایش"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleting(item)}
                      aria-label={`حذف ${item.name}`}
                      title="حذف"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <ItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => {
          setFormOpen(false)
          void load()
        }}
        onUnauthorized={onUnauthorized}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleting(null)
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف آیتم</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleting?.name}» مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deletePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  حذف…
                </>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
