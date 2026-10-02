import "server-only"

import type { MenuItem } from "@prisma/client"

import type { ItemOptionGroupDTO, MenuItemDTO } from "@/lib/types"

/**
 * Parse the `optionsJson` column of a MenuItem row into a typed array of
 * option groups. Returns an empty array if the column is empty, "[]", or
 * contains malformed JSON (defensive — the admin form validates, but we
 * don't want a corrupt row to crash the public menu).
 *
 * Also strips any fields not in our DTO shape (so a stored `{id, label,
 * options, extra: "junk"}` is narrowed to `{id, label, options}`).
 */
export function parseOptionsJson(raw: string): ItemOptionGroupDTO[] {
  if (!raw || raw === "[]") return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((g): g is ItemOptionGroupDTO =>
        g && typeof g === "object" &&
        typeof g.id === "string" && typeof g.label === "string" &&
        Array.isArray(g.options),
      )
      .map((g) => ({
        id: g.id,
        label: g.label,
        options: g.options
          .filter((o): o is { id: string; name: string; price: number; isDefault: boolean } =>
            o && typeof o === "object" &&
            typeof o.id === "string" && typeof o.name === "string" &&
            typeof o.price === "number" && typeof o.isDefault === "boolean",
          )
          .map((o) => ({
            id: o.id,
            name: o.name,
            price: o.price,
            isDefault: o.isDefault,
          })),
        // Preserve multiSelect (default false if absent for backward compat).
        multiSelect: typeof g.multiSelect === "boolean" ? g.multiSelect : false,
      }))
  } catch {
    return []
  }
}

/** Convert a Prisma MenuItem row (with the raw `optionsJson` string column)
 *  into the public `MenuItemDTO` shape (with the `options` array parsed).
 *
 *  Used by every API route that returns menu items so the client always
 *  sees the parsed array, never the raw JSON string.
 */
export function menuItemToDTO(row: MenuItem): MenuItemDTO {
  const { optionsJson, ...rest } = row
  // `rest` includes all the MenuItem fields except optionsJson. We add the
  // parsed `options` field so the DTO matches the type shape.
  return {
    ...rest,
    options: parseOptionsJson(optionsJson),
  }
}

/**
 * Check whether an item is available at the current Tehran local time,
 * based on its `availableFrom`/`availableTo` window.
 *
 * - Both null → always available (returns true).
 * - from ≤ to: available when now is in [from, to).
 * - from > to (overnight window, e.g. 18:00→02:00): available when
 *   now ≥ from OR now < to.
 *
 * @param availableFrom HH:MM string or null
 * @param availableTo   HH:MM string or null
 * @param nowMs         Optional override for the current time (for testing).
 *                      Defaults to `Date.now()`.
 */
export function isItemAvailableNow(
  availableFrom: string | null,
  availableTo: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!availableFrom && !availableTo) return true
  if (!availableFrom || !availableTo) return true // partial config = always available

  const fromMin = parseHourMinute(availableFrom)
  const toMin = parseHourMinute(availableTo)
  if (fromMin === null || toMin === null) return true // invalid format = always available

  // Get current time in Tehran timezone as minutes from midnight.
  const tehranTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(nowMs))
  const nowMin = parseHourMinute(tehranTime)
  if (nowMin === null) return true

  if (toMin <= fromMin) {
    // Overnight window (e.g. 18:00 → 02:00)
    return nowMin >= fromMin || nowMin < toMin
  }
  // Same-day window (e.g. 07:00 → 11:00)
  return nowMin >= fromMin && nowMin < toMin
}

/** Parse "HH:MM" → minutes from midnight. Returns null on invalid format. */
function parseHourMinute(value: string): number | null {
  const parts = value.split(":")
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 24 || m < 0 || m > 59) return null
  return h * 60 + m
}
