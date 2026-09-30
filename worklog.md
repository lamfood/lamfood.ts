# LamFood — Worklog

Project: Persian RTL restaurant menu (LamFood) with secured admin dashboard.
Stack: Next.js 16 App Router, TypeScript, Tailwind 4 + shadcn/ui, Prisma/SQLite, config.json-driven.
Colors: primary #166b73 (teal), accent #faa916 (amber), background #fbfffe. Language: Persian (fa, RTL). Font: Vazirmatn (CDN).

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Foundation — environment init, config.json, Prisma schema, theme, shared libs

Work Log:
- Inspected project: Next.js 16 + Tailwind 4 + shadcn/ui (all components present), zustand/zod/framer-motion/sonner installed, dev server running on port 3000.
- Loaded skills: fullstack-dev, image-search, image-generation. Ran init-fullstack.sh.
- Created `config.json` (single source of truth): restaurant info (name, tagline, logo=/uploads/logo.png, heroImage, about, openTimeText, openHourFrom/To, phone, whatsapp, address, location lat/lng, instagram, snappfood) + admin credentials (username=admin, scrypt passwordHash for default password `admin123`) + sessionSecret.
- Prisma schema: replaced scaffold User/Post with `MenuItem` (id, name, description, price[هزار تومان], category, image, available, sortOrder, timestamps, category index).
- Wrote shared libs: `src/lib/types.ts` (MenuItemDTO, RestaurantConfig, API response types), `src/lib/categories.ts` (8 categories with lucide icons — NOTE: lucide has no `Spaghetti`, pasta uses `UtensilsCrossed`), `src/lib/format.ts` (faNumber/formatPrice → «۲۰۰ هزار تومان»), `src/lib/api.ts` (client fetch wrapper w/ Persian errors), `src/lib/config.ts` (server: zod-validated config read/atomic write), `src/lib/auth.ts` (server: scrypt hashing, timingSafeEqual, in-memory sessions 12h, per-IP brute-force lockout 5 fails/15min → 15min lock, CSRF origin check, requireAdmin guard, randomized login delay).
- Rewrote `src/app/globals.css` with LamFood palette (primary #166b73, accent #faa916, bg #fbfffe), Vazirmatn font stack, smooth scroll + scroll-padding-top 120px, .no-scrollbar / .nice-scrollbar utilities.
- Rewrote `src/app/layout.tsx`: lang=fa dir=rtl, Vazirmatn via Google Fonts CDN, metadata fa, themeColor #166b73, sonner Toaster.
- Added `scripts/set-admin-password.ts` (bun scripts/set-admin-password.ts <password> to change admin password).
- Created dirs: public/uploads, scripts.

Stage Summary:
- Foundation complete. Shared contract files that subagents MUST import (not modify): src/lib/types.ts, src/lib/categories.ts, src/lib/format.ts, src/lib/api.ts, src/lib/auth.ts (server-only), src/lib/config.ts (server-only), globals.css, layout.tsx, config.json.
- API contract (implemented in Task 2): see worklog entry Task ID 2.

---
Task ID: 3-b
Agent: full-stack-developer (admin page)
Task: Secure admin dashboard — login (rate-limit aware) + items manager (CRUD/upload) + restaurant settings

Work Log:
- Read worklog + shared libs (types.ts, categories.ts, format.ts, api.ts) and admin API routes to lock the contract before coding.
- Created `src/app/admin/layout.tsx` (server, metadata «پنل مدیریت», robots noindex/nofollow, renders children only).
- Created `src/app/admin/page.tsx`: "use client" state machine checking→login|dashboard; on mount probes GET /api/admin/session; centered Loader2 on muted bg while checking; passes `onUnauthorized` down so any 401 flips back to login.
- Created `src/components/admin/LoginForm.tsx`: teal gradient + amber blur decor, branding from public GET /api/config (ChefHat fallback), LTR username/password inputs with icons + Eye/EyeOff toggle (no autofill breakage), h-12 submit; 401 → destructive Alert (server message), 429 → destructive Alert + submit disabled with live mm:ss countdown «تلاش مجدد تا ۱۴:۳۲» (Persian digits via faNumber), status 0 → amber warning Alert; success toast «خوش آمدید 👋»; default-credentials hint card below; double-submit guarded.
- Created `src/components/admin/AdminDashboard.tsx`: sticky glass header (logo/name/Badge «پنل مدیریت», next/link «مشاهده منو», outline-destructive logout → POST logout → toast «خارج شدید» + login view), welcome line with username, Tabs «آیتم‌های منو»/«تنظیمات رستوران».
- Created `src/components/admin/ItemsManager.tsx`: GET /api/admin/items on mount (skeleton grid → error+retry → grid 1/2/3), count Badge (faNumber), client-side search, Card per item (img h-32 rounded-xl / ImagePlus placeholder, price amber chip formatPrice, category icon Badge, «فعال در منو» Switch that PUTs the FULL payload and reverts+toasts on failure with tiny Loader2 while pending, ghost icon edit/delete size-11 with aria-labels, AlertDialog «حذف آیتم» → DELETE → toast «آیتم حذف شد» + list refresh), empty state ChefHat, ItemForm wired for create/edit.
- Created `src/components/admin/ItemForm.tsx`: shared Dialog for create/edit (max-h-[85vh] overflow nice-scrollbar rounded-2xl); image drop-zone (hidden file input, ≤2MB client check, POST /api/admin/upload FormData → /uploads URL, uploading state, X to clear) + collapsible URL Input bound to same value; name (maxLength 80), price (number/step1/ltr + live «نمایش در منو: …» Badge from formatPrice to teach the هزار-تومان unit), category Select from CATEGORIES (icon+فارسی), description Textarea (500 + faNumber counter), «نمایش در منو» Switch; client validation → POST/PUT full payload (description/image trimmed-or-null, sortOrder preserved) → toast «آیتم ذخیره شد» → onSaved.
- Created `src/components/admin/SettingsForm.tsx`: GET /api/admin/config into controlled state, 4 rounded-2xl SectionCards (هویت رستوران/Store, تماس و شبکه‌های اجتماعی/Phone, درباره و ساعت کاری/Info, آدرس و موقعیت مکانی/MapPin) with all specified fields + hints; sticky bottom h-12 save; client sanity checks (name required, whatsapp /^\d+$/, HH:MM /^\d{1,2}:\d{2}$/, lat ∈ [-90,90], lng ∈ [-180,180]) → PUT { restaurant } with numeric lat/lng → sync from response + toast «تنظیمات ذخیره شد»; note «تغییرات بلافاصله در صفحه منو اعمال می‌شود.».
- Verified with real browser automation: login success/failure, session probe, item create+toggle(edit/delete via dialogs), settings save + whatsapp validation toast, logout; smoke-tested REST flow via curl (cookie jar). Restored any mutated data (tagline) afterwards.
- `bunx tsc --noEmit` clean for src/; `tail dev.log` shows GET /admin 200 and all admin API calls 200 — no compile/type errors.

Stage Summary:
- Admin dashboard complete: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/components/admin/{LoginForm,AdminDashboard,ItemsManager,ItemForm,SettingsForm}.tsx`. No other files touched; no new packages.
- Decisions: availability toggle updates list optimistically from the PUT contract (no extra refetch flash); delete does local removal + background refetch; lockout countdown re-enables button automatically while the 429 alert stays until next attempt; category icons rendered via CATEGORIES lookup.
- Contract gap (server, not fixed per ownership rules): `PUT /api/admin/config` zod schema rejects whatsapp="" (regex runs before default applies) and openHourFrom/To have no empty fallback — client mirrors server rules (digits-only, HH:MM required) so admins see the Persian server message if they clear those fields; empty whatsapp can block saving other settings until a value is entered.
- Pre-existing asset gap noticed: config.json references /uploads/hero.png but the file does not exist (public menu 404s) — for Task 3-a/orchestrator to fix, not admin scope.
---
Task ID: 3-a
Agent: full-stack-developer (menu page)
Task: Public menu page — hero, info cards, sticky category nav with scroll-spy + search, menu sections, basket (store/sheet/floating), location sheet, footer

Work Log:
- Read shared modules (types.ts, categories.ts, format.ts, api.ts, globals.css, layout.tsx, sheet/card/button/badge UI sources) and Task 1 worklog before writing any code.
- Created `src/lib/basket-store.ts`: zustand + persist (name "lamfood-basket", skipHydration:true), lines `{id,name,price,image,qty}` keyed by item id; actions add/setQty(qty<=0 removes)/remove/clear; selectors basketCount/basketTotal/basketLineList. add() stores the minimal 5-field line (not the whole DTO) to keep localStorage lean.
- Created `src/components/menu/Hero.tsx`: full-bleed heroImage cover + teal gradient overlay (from-#0f4a50/95 via-#166b73/85 to-#166b73/70; plain gradient when no image), amber blur circles, logo (fallback ChefHat), name/nameEn/tagline/about, Tehran-timezone open/closed badge (computed in page AFTER mount; neutral pre-mount placeholder → no hydration mismatch), amber «مشاهده منو» + outline snappfood CTAs, glassy quick chips (tel:, address→LocationSheet, instagram). hero <img> has onError fallback to plain gradient.
- Created `src/components/menu/InfoCards.tsx`: 6-card responsive grid (ساعت کاری+open badge, تلفن tel: link, آدرس+«مشاهده روی نقشه», اینستاگرام, اسنپ‌فود, درباره ما sm:col-span-2 lg:col-span-1); instagram/snappfood/phone/address cards render only when the field is non-empty.
- Created `src/components/menu/StickyCategoryNav.tsx`: sticky top-0 z-40 backdrop-blur bar; icon search toggle (AnimatePresence expanding row, RTL-correct start/end icons, «N نتیجه» count); chips only for categories having items (active=bg-primary, IntersectionObserver rootMargin "-45% 0px -50% 0px", default=first group); mini basket button with count Badge.
- Created `src/components/menu/MenuSection.tsx`: category sections (`id=cat-${key}`, amber icon square header + count badge) in CATEGORIES order; ItemCard = framer-motion fade-in-up card, aspect-[4/3] lazy image (or big category-icon placeholder), price chip bg-accent/15 text-#8a5b00, add button ↔ primary stepper (whileTap scale 0.92, aria-labels per item name); search mode = flat results grid + «نتایج جستجو برای «q»» + empty state (SearchX, «موردی یافت نشد», clear button); empty-menu state «منو به‌زودی».
- Created `src/components/menu/FloatingBasket.tsx`: springs up only when count>0, pill (icon + «N آیتم» + total) with ChevronLeft (RTL forward), opens BasketSheet.
- Created `src/components/menu/BasketSheet.tsx`: bottom Sheet (max-h-85vh, nice-scrollbar, drag-handle bar), divide-y line rows (thumb/placeholder, unit price, compact stepper, line total, Trash2), footer = مجموع سفارش + name Input + note Textarea (maxLength 200) + full-width WhatsApp green checkout building the exact Persian wa.me message (verified live URL: `سلام لام‌فود 👋 … • ۱× … — ۲۸۰ هزار تومان … جمع کل: ۹۲۰ هزار تومان`), toast on success/keep basket, ghost-destructive «پاک کردن سبد» + toast, empty state with «مشاهده منو».
- Created `src/components/menu/LocationSheet.tsx`: address + Copy button (clipboard + «آدرس کپی شد» toast), 4 map option buttons (گوگل مپ/نشان/بلد/OpenStreetMap) built from config.location, «موقعیتی ثبت نشده است» when lat/lng are both 0.
- Created `src/components/menu/MenuFooter.tsx`: bg-primary mt-auto footer (stays glued to bottom on short pages via root min-h-screen flex + main flex-1), logo+tagline, quick links, contact line, © year with faNumber + tiny /admin link, safe-area padding.
- Rewrote `src/app/page.tsx`: client component; Promise.all(apiFetch /api/config + /api/menu) with loading (skeleton hero+cards)/error (Persian message+retry)/ready states; owns query/searchOpen/basketOpen/locationOpen/isOpenNow; memoized groups + search results (shared count with nav); composes all components, footer sticks bottom.
- Browser-tested end-to-end in an isolated agent-browser session with a mocked /api/menu (3 items): chips/sections render, add→stepper→floating pill, basket sheet steppers/remove/total, WhatsApp tab opens with correct Persian message, copy toast, search results + empty state + clear, open/closed badge, basket persists across reload (faNumber digits in UI), no console errors, no horizontal overflow, footer flush at viewport bottom.

Stage Summary:
- Public menu page complete: page.tsx + 9 menu components + basket-store.ts (all under src/app/page.tsx, src/components/menu/*, src/lib/basket-store.ts — no shared files touched).
- Contract used as-is: GET /api/config → {restaurant}, GET /api/menu → {items} (available only). Gap noted: config.heroImage points to /uploads/hero.png which does not exist yet (only logo.png in public/uploads) → hero falls back to plain gradient via onError; once the file is generated it renders automatically. Menu was empty during dev, so the «منو به‌زودی» empty state was verified live.
- Basket message/toast copy, category keys and price formatting all rely on src/lib shared helpers (faNumber/formatPrice) — no latin digits in UI.

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Images + DB seed

Work Log:
- image-search upstream was down (HTTP 400 from serp endpoint) — switched entirely to the image-generation endpoint (z-ai CLI).
- Generated: public/uploads/logo.png (lamb+burger mascot, brand colors), hero.png (1344x768 food flat-lay; NOTE: CLI presets 1440x720/720x1440 are rejected upstream — 720 not multiple of 32; use 1344x768/1152x864), and 2 photos per category (food-<category>-1/2.png, 16 total).
- Parallel background z-ai jobs get killed in this sandbox — only sequential foreground runs are reliable.
- Wrote scripts/seed.ts (2 items per category, 16 total, Persian names/descriptions, price in هزار تومان) and ran with --force.
- Copied logo.png → src/app/icon.png (favicon).

Stage Summary:
- All assets in public/uploads; DB seeded with 16 items; /api/menu serves them.

---
Task ID: 4
Agent: main (Z.ai Code)
Task: Lint fixes + full browser E2E verification + security hardening

Work Log:
- Fixed 3 react-hooks/set-state-in-effect lint errors: page.tsx (defer data load + open/closed computation via setTimeout 0 with cleanup), StickyCategoryNav.tsx (derived `active` from `observed` instead of reset effect).
- **Critical bug found & fixed**: in-memory session Map was NOT shared across Next.js route bundles (freshly compiled /api/admin/config had its own copy → 401 right after login). Rewrote sessions as STATELESS HMAC-SHA256 signed tokens (base64url payload.signature, 12h expiry, timingSafeEqual verification, secret = config.sessionSecret). Verified: session/items/config all accept the same cookie; tampered cookie rejected.
- Fixed config schema: whatsapp now allows empty string (admins can clear it).
- Fixed lockout message to use Persian digits (۱۵).
- Browser E2E (agent-browser, mobile 390x844 + desktop 1440x900): hero render, live open/closed badge, info cards, sticky nav + scroll-spy, 8 category sections, 16 items with photos, add-to-basket → stepper → floating pill (۲ آیتم/۲۳۰ هزار تومان), basket sheet (unit/line totals, clear, name/note), WhatsApp checkout message verified via window.open interception («سلام لام‌فود 👋 … جمع کل: …»), search (پیتزا → ۲ نتیجه, empty state), admin: wrong-password error, login, dashboard (16 items), add item (appears on public menu), edit price 250→299, delete with AlertDialog (removed), settings tab → tagline change saved → propagated to /api/config instantly (then restored), logout → back to login. Brute-force: 5 wrong logins (X-Forwarded-For 10.99.99.99) → 6th attempt HTTP 429 + Retry-After 900 even with correct password.
- Footer verified flush with viewport bottom (footer bottom=900=innerHeight); natural push on long content.
- Final `bun run lint`: clean. dev.log: no runtime errors. Browser console: clean.

Stage Summary:
- Project complete and browser-verified. Admin credentials: admin / admin123 (change via `bun scripts/set-admin-password.ts <password>`). Restaurant info fully driven by config.json (editable live in admin → تنظیمات رستوران).

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Fix admin login failing (admin/admin123 → 403) — CSRF origin check vs proxy tunnel + cookie-less embeds

Work Log:
- Diagnosed from dev.log: user's login attempts returned 403 (csrf_rejected), NOT 401 — the stored scrypt hash still matches admin123 exactly (verified with bun script); the browser's Origin (public preview URL) didn't match the Host the Next server sees behind the sandbox tunnel, so assertSameOrigin rejected requests before credential evaluation. 403 also never registered as a failure (silent reject loop).
- Rewrote assertSameOrigin (src/lib/auth.ts) to be proxy/embed-aware, fail-closed where it matters: candidates = Host + every X-Forwarded-Host; Origin:"null" (sandboxed iframe / privacy webview) accepted only with unforgeable same-origin Sec-Fetch-Site metadata; Origin==Referer fallback (tunnels that rewrite both) also requires Sec-Fetch-Site same-origin; explicit cross-site metadata → 403 with [csrf] JSON diagnostic logged.
- Hardened sessions for cookie-blocked embeds: login response now includes the same HMAC-signed token, client stores it (src/lib/auth-client.ts, localStorage origin-scoped) and apiFetch sends Authorization: Bearer; getSession accepts Bearer OR HttpOnly cookie; apiFetch clears stored token on 401; logout clears it (AdminDashboard). Cookies remain SameSite=Lax primary path.
- Security matrix verified via curl: cross-site attack (browser metadata) → 403; sandboxed-iframe attack (null+cross-site) → 403; tunnel-rewritten Host → 200; X-Forwarded-Host → 200; preview iframe null+same-origin → 200; wrong password → 401; brute-force regression: 5 wrong → lock, 6th with correct password → 429 «۱۵ دقیقه».
- Real-browser attack test: throwaway evil page on :4444, Chromium cross-site fetch → server logged [csrf] rejection (Sec-Fetch-Site: same-site) → 403; same-origin control → 401 (CSRF passed, creds checked).
- agent-browser E2E: admin/admin123 → dashboard (16 items), logout → login view + token cleared, localStorage token present while logged in; public menu page unaffected; console clean; bun run lint clean.

Stage Summary:
- Root cause: origin check was strict Host==Origin, broken by preview tunnel Host rewriting. Fix is proxy-aware + fetch-metadata hardened, and admin auth now works in cookie-less embedded contexts via the signed Bearer fallback. Brute-force lockout, HMAC session verification, and CSRF rejection (403+diagnostics) all intact and regression-tested.
- Note for deployers: for a custom domain behind unknown proxies, browsers send correct metadata automatically — no config change needed; Host/X-Forwarded-Host/Sec-Fetch-Site/Referer consistency is all that is checked.
