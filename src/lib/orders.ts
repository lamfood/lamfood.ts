import "server-only"

import { randomBytes } from "crypto"

import { db } from "@/lib/db"
import type { Order, OrderLineDTO, OrderStatus } from "@/lib/types"

/**
 * Generate a human-friendly order code like "LF-7K3X9" — 5 base32 chars
 * (no ambiguous chars: no 0/O, 1/I/L, U). Collision-checked against the DB
 * (extremely unlikely: 32^5 ≈ 33M). Retries up to 5 times on collision.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ" // 29 chars, no 0/1/I/L/O/U
const CODE_LENGTH = 5
const CODE_PREFIX = "LF-"

export async function generateUniqueOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = randomBytes(CODE_LENGTH)
    let code = ""
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
    }
    const full = CODE_PREFIX + code
    const exists = await db.order.findUnique({ where: { publicCode: full }, select: { id: true } })
    if (!exists) return full
  }
  // Practically unreachable. Fall back to a longer random string.
  return CODE_PREFIX + randomBytes(4).toString("hex").toUpperCase()
}

/** Convert a Prisma Order (with linesJson string) into the OrderDTO shape. */
export function toOrderDTO(row: {
  id: string
  publicCode: string
  status: OrderStatus | string
  customerName: string
  note: string
  linesJson: string
  total: number
  customerIp: string
  createdAt: Date
  updatedAt: Date
}): {
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
} {
  let lines: OrderLineDTO[] = []
  try {
    const parsed = JSON.parse(row.linesJson)
    if (Array.isArray(parsed)) {
      lines = parsed.filter(
        (l): l is OrderLineDTO =>
          l && typeof l === "object" && typeof l.id === "string" && typeof l.name === "string" && typeof l.price === "number" && typeof l.qty === "number",
      )
    }
  } catch {
    // Corrupt JSON — leave lines empty; the order is still visible.
  }
  return {
    id: row.id,
    publicCode: row.publicCode,
    status: row.status as OrderStatus,
    customerName: row.customerName,
    note: row.note,
    lines,
    total: row.total,
    customerIp: row.customerIp,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Type narrowing helper for the Prisma Order model (so we don't leak the
 *  Prisma-generated type to client code). */
export function isOrderRow(row: unknown): row is Order {
  return !!row && typeof row === "object" && "publicCode" in row
}
