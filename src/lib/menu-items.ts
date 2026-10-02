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
