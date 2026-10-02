import "server-only";

import fs from "fs";
import path from "path";
import { z } from "zod";

import type { RestaurantConfig, ThemeColors } from "@/lib/types";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

const timeRe = /^(?:[01]?\d|2[0-4]):[0-5]\d$/;

/** Hex color (#rgb or #rrggbb). */
const hexColor = z
  .string()
  .trim()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "رنگ باید به صورت HEX باشد (مثل #166b73)",
  )
  .default("#166b73");

export const themeSchema = z.object({
  primary: hexColor,
  primaryForeground: hexColor,
  accent: hexColor,
  accentForeground: hexColor,
  background: hexColor,
  foreground: hexColor,
});

export const DEFAULT_THEME: ThemeColors = {
  primary: "#166b73",
  primaryForeground: "#fbfffe",
  accent: "#faa916",
  accentForeground: "#2b1d02",
  background: "#fbfffe",
  foreground: "#0d3b41",
};

export const restaurantConfigSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).default(""),
  tagline: z.string().trim().max(140).default(""),
  logo: z.string().trim().max(500).default(""),
  heroImage: z.string().trim().max(500).default(""),
  about: z.string().trim().max(2000).default(""),
  openTimeText: z.string().trim().max(140).default(""),
  openHourFrom: z.string().regex(timeRe, "ساعت نامعتبر است").default("10:00"),
  openHourTo: z.string().regex(timeRe, "ساعت نامعتبر است").default("23:00"),
  phone: z.string().trim().max(20).default(""),
  whatsapp: z
    .string()
    .trim()
    .max(15)
    .refine(
      (v) => v === "" || /^\d{6,15}$/.test(v),
      "شماره واتساپ باید فقط رقم و با کد کشور باشد (مثل 98912...)",
    )
    .default(""),
  address: z.string().trim().max(300).default(""),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .default({ lat: 35.7, lng: 51.4 }),
  instagram: z.string().trim().max(300).default(""),
  snappfood: z.string().trim().max(300).default(""),
  theme: themeSchema.default(DEFAULT_THEME),
});

export const restaurantUpdateSchema = z.object({
  restaurant: restaurantConfigSchema,
});

const DEFAULT_RESTAURANT: RestaurantConfig = {
  name: "لم‌فود",
  nameEn: "LamFood",
  tagline: "",
  logo: "",
  heroImage: "",
  about: "",
  openTimeText: "",
  openHourFrom: "10:00",
  openHourTo: "23:00",
  phone: "",
  whatsapp: "",
  address: "",
  location: { lat: 35.7, lng: 51.4 },
  instagram: "",
  snappfood: "",
  theme: DEFAULT_THEME,
};

export interface AdminConfig {
  restaurant: RestaurantConfig;
  admin: { username: string; passwordHash: string };
  sessionSecret: string;
}

function atomicWrite(data: string) {
  const tmp = CONFIG_PATH + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, CONFIG_PATH);
}

/** Read + validate config.json; falls back to defaults for invalid restaurant fields. */
export function readConfig(): AdminConfig {
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    raw = {};
  }

  const parsed = restaurantConfigSchema.safeParse(raw.restaurant);
  const restaurant: RestaurantConfig = parsed.success
    ? parsed.data
    : DEFAULT_RESTAURANT;

  const adminRaw = (raw.admin ?? {}) as {
    username?: unknown;
    passwordHash?: unknown;
  };
  const admin = {
    username:
      typeof adminRaw.username === "string" ? adminRaw.username : "admin",
    passwordHash:
      typeof adminRaw.passwordHash === "string" ? adminRaw.passwordHash : "",
  };
  const sessionSecret =
    typeof raw.sessionSecret === "string" && raw.sessionSecret.length >= 32
      ? raw.sessionSecret
      : "";

  return { restaurant, admin, sessionSecret };
}

export function getPublicConfig(): { restaurant: RestaurantConfig } {
  return { restaurant: readConfig().restaurant };
}

/** Validate + persist a new restaurant config (admin settings). */
export function updateRestaurantConfig(input: unknown): RestaurantConfig {
  const parsed = restaurantUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(first?.message ?? "اطلاعات وارد شده نامعتبر است");
  }
  const current = readConfig();
  const next: AdminConfig = { ...current, restaurant: parsed.data.restaurant };
  atomicWrite(JSON.stringify(next, null, 2) + "\n");
  return next.restaurant;
}
