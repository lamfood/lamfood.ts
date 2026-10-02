export interface LocationInfo {
  lat: number
  lng: number
}

/** Dynamic brand colors persisted in config.json and applied at runtime. */
export interface ThemeColors {
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
}

export interface RestaurantConfig {
  name: string
  nameEn: string
  tagline: string
  logo: string
  heroImage: string
  about: string
  openTimeText: string
  openHourFrom: string
  openHourTo: string
  phone: string
  whatsapp: string
  address: string
  location: LocationInfo
  instagram: string
  snappfood: string
  theme: ThemeColors
}

export interface MenuItemDTO {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  available: boolean
  featured: boolean
  sortOrder: number
  /** Admin-defined add-ons (size, extra cheese, spiciness, ...).
   *  Empty array if the item has no options. */
  options: ItemOptionDTO[]
}

/** A selectable add-on for a menu item. `price` is in «هزار تومان» units
 *  and is ADDED to the item's base price when the option is selected.
 *  `isDefault` marks the option that's pre-selected when the customer opens
 *  the item details dialog (e.g. the "medium" size). */
export interface ItemOptionDTO {
  /** Stable id within the item (used as the form field key). */
  id: string
  name: string
  /** Price delta in «هزار تومان» (can be 0 for a free option like "no ice"). */
  price: number
  isDefault: boolean
}

/** Group of options where the customer picks exactly one (e.g. size).
 *  A single MenuItem can have multiple option groups (e.g. size + spice level).
 *  Stored on MenuItem.optionsJson as an array of these. */
export interface ItemOptionGroupDTO {
  id: string
  /** Persian label shown above the group (e.g. «اندازه», «سطح تندی»). */
  label: string
  /** One of the options in `options` should have isDefault=true (or none). */
  options: ItemOptionDTO[]
}

export type MenuResponse = { items: MenuItemDTO[] }
export type PublicConfigResponse = { restaurant: RestaurantConfig }

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/** Order status lifecycle. Kept in sync with the Prisma enum. */
export const ORDER_STATUSES = [
  "NEW",
  "SEEN",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Persian label + tailwind color token for each status. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: "new" | "info" | "warn" | "good" | "done" | "bad" }
> = {
  NEW: { label: "جدید", tone: "new" },
  SEEN: { label: "دیده شد", tone: "info" },
  PREPARING: { label: "در حال آماده‌سازی", tone: "warn" },
  READY: { label: "آماده تحویل", tone: "good" },
  DELIVERED: { label: "تحویل شد", tone: "done" },
  CANCELLED: { label: "لغو شد", tone: "bad" },
}

/** One basket line, snapshotted at order-submission time. */
export interface OrderLineDTO {
  id: string
  name: string
  price: number
  qty: number
  image: string | null
  /** Names of the selected options at submission time (e.g.
   *  «اندازه بزرگ، پنیر اضافه»). Empty if the item had no options or none
   *  were selected. The unit `price` already includes the option deltas;
   *  this field is just for human-readable display on the order. */
  selectedOptions?: string[]
}

/** Full order as returned by the API. */
export interface OrderDTO {
  id: string
  publicCode: string
  status: OrderStatus
  customerName: string
  note: string
  lines: OrderLineDTO[]
  total: number
  customerIp: string
  createdAt: string
  updatedAt: string
}

export type OrderListResponse = { orders: OrderDTO[] }
export type OrderResponse = { order: OrderDTO }
/** Returned to the public checkout endpoint (no customerIp / no admin fields). */
export type PublicOrderResponse = {
  order: Pick<OrderDTO, "publicCode" | "status" | "total" | "createdAt">
}
