"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Info,
  Loader2,
  MapPin,
  Palette,
  Phone,
  RefreshCcw,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api"
import { applyTheme } from "@/components/ThemeProvider"
import type { PublicConfigResponse, RestaurantConfig, ThemeColors } from "@/lib/types";

const TIME_RE = /^\d{1,2}:\d{2}$/;
const WHATSAPP_RE = /^\d+$/;

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Store;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 rounded-2xl py-5">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4.5" aria-hidden />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 sm:px-6">{children}</CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = value.startsWith("#") ? value.slice(1) : value;

  function handleText(text: string) {
    // Allow partial typing; only push valid full hex codes to the state.
    if (HEX_RE.test(text)) onChange(formatHex(text));
  }

  return (
    <Field id={id} label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-input bg-background p-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} — انتخاب رنگ`}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent"
        />
        <Input
          id={id}
          dir="ltr"
          className="h-10 border-0 bg-transparent font-mono text-sm uppercase shadow-none"
          value={`#${normalized}`}
          onChange={(e) => handleText(e.target.value)}
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </Field>
  );
}

/** Normalize a hex value to lowercase with a leading # (keeps the schema happy). */
function formatHex(value: string): string {
  const cleaned = value.replace(/^#/, "");
  return `#${cleaned.toLowerCase()}`;
}

export default function SettingsForm({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [cfg, setCfg] = useState<RestaurantConfig | null>(null);
  const [latText, setLatText] = useState<string>("");
  const [lngText, setLngText] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await apiFetch<PublicConfigResponse>("/api/admin/config");
      setCfg(data.restaurant);
      setLatText(String(data.restaurant.location.lat));
      setLngText(String(data.restaurant.location.lng));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setLoadFailed(true);
      toast.error(err instanceof Error ? err.message : "خطا در دریافت تنظیمات");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof RestaurantConfig>(
    key: K,
    value: RestaurantConfig[K],
  ) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setThemeField<K extends keyof ThemeColors>(
    key: K,
    value: ThemeColors[K],
  ) {
    setCfg((prev) =>
      prev ? { ...prev, theme: { ...prev.theme, [key]: value } } : prev,
    );
  }

  function setLocationText(kind: "lat" | "lng", value: string) {
    if (kind === "lat") setLatText(value);
    else setLngText(value);
  }

  async function handleSave() {
    if (!cfg || saving) return;

    if (cfg.name.trim() === "") {
      toast.error("نام رستوران الزامی است.");
      return;
    }

    const whatsapp = cfg.whatsapp.trim();
    if (whatsapp !== "" && !WHATSAPP_RE.test(whatsapp)) {
      toast.error("شماره واتساپ باید فقط رقم باشد — مثال: 989121234567");
      return;
    }

    if (
      !TIME_RE.test(cfg.openHourFrom.trim()) ||
      !TIME_RE.test(cfg.openHourTo.trim())
    ) {
      toast.error("فرمت ساعت کاری باید مثل 10:00 باشد (از 00:00 تا 24:00).");
      return;
    }

    const lat = Number(latText.trim());
    const lng = Number(lngText.trim());
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.error("عرض جغرافیایی (lat) باید عددی بین -90 و 90 باشد.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.error("طول جغرافیایی (lng) باید عددی بین -180 و 180 باشد.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restaurant: {
          ...cfg,
          location: { lat, lng },
        },
      };
      const data = await apiFetch<PublicConfigResponse>("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setCfg(data.restaurant);
      setLatText(String(data.restaurant.location.lat));
      setLngText(String(data.restaurant.location.lng));
      // Apply the freshly saved colors immediately so the change feels live.
      applyTheme(data.restaurant.theme);
      toast.success("تنظیمات ذخیره شد");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "ذخیره تنظیمات ناموفق بود",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4" role="status" aria-live="polite">
        <span className="sr-only">در حال بارگذاری تنظیمات…</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (loadFailed || !cfg) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          دریافت تنظیمات ناموفق بود.
        </p>
        <Button variant="outline" onClick={() => void load()} className="h-11">
          <RefreshCcw className="size-4" aria-hidden />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* 1 — Identity */}
      <SectionCard icon={Store} title="هویت رستوران">
        <Field id="cfg-name" label="نام رستوران">
          <Input
            id="cfg-name"
            value={cfg.name}
            onChange={(e) => setField("name", e.target.value)}
            maxLength={80}
            className="h-11"
          />
        </Field>
        <Field id="cfg-nameEn" label="نام لاتین">
          <Input
            id="cfg-nameEn"
            dir="ltr"
            className="h-11 text-left"
            value={cfg.nameEn}
            onChange={(e) => setField("nameEn", e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field id="cfg-tagline" label="شعار">
          <Input
            id="cfg-tagline"
            value={cfg.tagline}
            onChange={(e) => setField("tagline", e.target.value)}
            maxLength={140}
            className="h-11"
          />
        </Field>
        <Field
          id="cfg-logo"
          label="آدرس لوگو"
          hint="مسیر تصویر مثل /uploads/logo.png"
        >
          <Input
            id="cfg-logo"
            dir="ltr"
            className="h-11 text-left text-sm"
            value={cfg.logo}
            onChange={(e) => setField("logo", e.target.value)}
            maxLength={500}
          />
        </Field>
        <Field id="cfg-hero" label="آدرس تصویر هیرو">
          <Input
            id="cfg-hero"
            dir="ltr"
            className="h-11 text-left text-sm"
            value={cfg.heroImage}
            onChange={(e) => setField("heroImage", e.target.value)}
            maxLength={500}
          />
        </Field>
      </SectionCard>

      {/* 2 — Contact & socials */}
      <SectionCard icon={Phone} title="تماس و شبکه‌های اجتماعی">
        <Field id="cfg-phone" label="شماره تلفن">
          <Input
            id="cfg-phone"
            dir="ltr"
            inputMode="tel"
            className="h-11 text-left"
            value={cfg.phone}
            onChange={(e) => setField("phone", e.target.value)}
            maxLength={20}
          />
        </Field>
        <Field
          id="cfg-whatsapp"
          label="شماره واتساپ با کد کشور، فقط رقم"
          hint="مثال: 989121234567"
        >
          <Input
            id="cfg-whatsapp"
            dir="ltr"
            inputMode="numeric"
            className="h-11 text-left"
            value={cfg.whatsapp}
            onChange={(e) => setField("whatsapp", e.target.value)}
          />
        </Field>
        <Field id="cfg-instagram" label="آدرس اینستاگرام">
          <Input
            id="cfg-instagram"
            dir="ltr"
            className="h-11 text-left text-sm"
            value={cfg.instagram}
            onChange={(e) => setField("instagram", e.target.value)}
            maxLength={300}
          />
        </Field>
        <Field id="cfg-snappfood" label="آدرس اسنپ‌فود">
          <Input
            id="cfg-snappfood"
            dir="ltr"
            className="h-11 text-left text-sm"
            value={cfg.snappfood}
            onChange={(e) => setField("snappfood", e.target.value)}
            maxLength={300}
          />
        </Field>
      </SectionCard>

      {/* 3 — About & hours */}
      <SectionCard icon={Info} title="درباره و ساعت کاری">
        <Field id="cfg-about" label="درباره رستوران">
          <Textarea
            id="cfg-about"
            rows={4}
            value={cfg.about}
            onChange={(e) => setField("about", e.target.value)}
            maxLength={2000}
          />
        </Field>
        <Field
          id="cfg-openTimeText"
          label="متن ساعت کاری"
          hint="مثال: همه روزه از ۱۰ صبح تا ۱۲ شب"
        >
          <Input
            id="cfg-openTimeText"
            value={cfg.openTimeText}
            onChange={(e) => setField("openTimeText", e.target.value)}
            maxLength={140}
            className="h-11"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="cfg-openFrom"
            label="ساعت شروع"
            hint="فرمت HH:MM — از ۰۰:۰۰ تا ۲۴:۰۰"
          >
            <Input
              id="cfg-openFrom"
              dir="ltr"
              className="h-11 text-left"
              placeholder="10:00"
              value={cfg.openHourFrom}
              onChange={(e) => setField("openHourFrom", e.target.value)}
            />
          </Field>
          <Field id="cfg-openTo" label="ساعت پایان" hint="مثال: 24:00">
            <Input
              id="cfg-openTo"
              dir="ltr"
              className="h-11 text-left"
              placeholder="24:00"
              value={cfg.openHourTo}
              onChange={(e) => setField("openHourTo", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {/* 4 — Address & location */}
      <SectionCard icon={MapPin} title="آدرس و موقعیت مکانی">
        <Field id="cfg-address" label="آدرس">
          <Textarea
            id="cfg-address"
            rows={2}
            value={cfg.address}
            onChange={(e) => setField("address", e.target.value)}
            maxLength={300}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="cfg-lat"
            label="عرض جغرافیایی (lat)"
            hint="مختصات را از گوگل مپ بگیرید"
          >
            <Input
              id="cfg-lat"
              type="number"
              step="any"
              dir="ltr"
              className="text-left"
              value={latText}
              onChange={(e) => setLocationText("lat", e.target.value)}
            />
          </Field>
          <Field
            id="cfg-lng"
            label="طول جغرافیایی (lng)"
            hint="مختصات را از گوگل مپ بگیرید"
          >
            <Input
              id="cfg-lng"
              type="number"
              step="any"
              dir="ltr"
              className="text-left"
              value={lngText}
              onChange={(e) => setLocationText("lng", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {/* 5 — Colors & appearance */}
      <SectionCard icon={Palette} title="رنگ‌ها و ظاهر">
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            id="cfg-theme-primary"
            label="رنگ اصلی"
            value={cfg.theme.primary}
            onChange={(v) => setThemeField("primary", v)}
          />
          <ColorField
            id="cfg-theme-primary-fg"
            label="رنگ متن روی اصلی"
            value={cfg.theme.primaryForeground}
            onChange={(v) => setThemeField("primaryForeground", v)}
          />
          <ColorField
            id="cfg-theme-accent"
            label="رنگ هایلایت (اکسنت)"
            value={cfg.theme.accent}
            onChange={(v) => setThemeField("accent", v)}
          />
          <ColorField
            id="cfg-theme-accent-fg"
            label="رنگ متن روی اکسنت"
            value={cfg.theme.accentForeground}
            onChange={(v) => setThemeField("accentForeground", v)}
          />
          <ColorField
            id="cfg-theme-background"
            label="رنگ پس‌زمینه"
            value={cfg.theme.background}
            onChange={(v) => setThemeField("background", v)}
          />
          <ColorField
            id="cfg-theme-foreground"
            label="رنگ متن اصلی"
            value={cfg.theme.foreground}
            onChange={(v) => setThemeField("foreground", v)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          بقیه‌ی رنگ‌ها (secondary، border، muted و …) به‌صورت خودکار از رنگ
          اصلی و پس‌زمینه ساخته می‌شوند تا ظاهر یکدست بماند.
        </p>
      </SectionCard>

      {/* Save */}
      <div className="sticky bottom-4 z-10 pt-1">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="h-12 w-full text-base font-bold shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              در حال ذخیره…
            </>
          ) : (
            "ذخیره تنظیمات"
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        تغییرات بلافاصله در صفحه منو اعمال می‌شود.
      </p>
    </div>
  );
}
