# LamFood.ts — Work Log

This file tracks all work performed on the LamFood restaurant menu project
(GitHub: `lamfood/lamfood.ts`). The local dev sandbox lives at
`/home/z/my-project` and runs on port 3000.

---

Task ID: 0
Agent: main (orchestrator)
Task: Bootstrap — clone the lamfood/lamfood.ts repo into the sandbox and
prepare the working directory.

Work Log:
- Cloned the GitHub repo `lamfood/lamfood.ts` to `/tmp/lamfood_repo` using the
  supplied PAT.
- Inspected repo structure: `src/lib/categories.ts` (8 categories), `src/lib/config.ts`,
  `src/lib/types.ts`, `src/components/ThemeProvider.tsx`, `src/components/admin/SettingsForm.tsx`,
  `src/components/menu/*`, `src/components/admin/ItemForm.tsx`, `src/components/admin/ItemsManager.tsx`,
  `src/components/admin/LoginForm.tsx`, `prisma/schema.prisma`, `scripts/seed.ts`, `config.json`.
- Identified the **theme bug**: `applyTheme()` only updates 6 base vars + derives
  secondary/muted/border/input/ring/card/popover/sidebar — but leaves
  `--secondary-foreground`, `--muted-foreground`, `--card-foreground`,
  `--popover-foreground`, `--sidebar-foreground`, `--sidebar-accent`,
  `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-primary-foreground`,
  and `--chart-1..5` at their hardcoded globals.css values. Also several
  components hardcode `text-[#8a5b00]`, `bg-[#faa916]`, `from-[#0f4a50]`, etc.
- Planned the category update: 8 → 12 categories
  (add hotDrinks, coldDrinks, herbalTea, shake; reorder).
- Planned the "view all categories" feature: add a `CategoryGrid` section
  between `StickyCategoryNav` and `MenuSection`.

Stage Summary:
- Repo cloned and inspected.
- Work plan ready. Next: sync into `/home/z/my-project`, install deps, push DB,
  start dev, then implement the 4 requested changes.

---
Task ID: 1
Agent: main (orchestrator)
Task: Implement the 4 user-requested changes to the lamfood/lamfood.ts repo:
  1) Update categories to 12.
  2) BugFix — admin color setting (some colors didn't change).
  3) Add "view all categories" option for دسته‌بندی.
  4) Ensure clean git structure before push.

Work Log:
- Synced the cloned lamfood repo into /home/z/my-project (preserved sandbox
  infra: .zscripts/, Caddyfile, .env; replaced everything else including .git
  so the lamfood commit history + remote is now the working repo).
- Installed deps (`bun install` — 1 package added), generated Prisma client,
  pushed schema (`bun run db:push`), seeded DB (`bun scripts/seed.ts`).
- Started dev server on port 3000 (daemon pattern: `nohup setsid bun run dev`
  in a subshell so it survives bash session churn).
- Generated 8 AI images via the z-ai-web-dev-sdk CLI for the 4 new
  categories (hotDrinks, coldDrinks, herbalTea, shake) → public/uploads/.
- Implementation:
  * `src/lib/categories.ts`: 12 categories with valid lucide-react icons
    (Soup, GlassWater, Leaf, Milk for the new ones; verified against the
    package's exported names — Mug/Glass don't exist).
  * `scripts/seed.ts`: +8 demo items (24 total), referencing the new images.
  * `src/components/ThemeProvider.tsx`: rewrote `applyTheme()` so every
    CSS variable is derived from the 6 user-controlled tokens. Added a
    `mixToHex()` helper for `-foreground` tokens that need actual hex
    values (instead of color-mix expressions). Bug-fix verification: when
    the admin changes primary → #AA0000 and accent → #00AA00, the previously
    frozen tokens (`--secondary-foreground`, `--muted-foreground`,
    `--card-foreground`, `--popover-foreground`, `--sidebar-foreground`,
    `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`,
    `--chart-1..5`) now all track the new palette.
  * `src/components/menu/MenuSection.tsx`, `src/components/admin/ItemForm.tsx`,
    `src/components/admin/ItemsManager.tsx`: replaced hardcoded
    `text-[#8a5b00]` with `text-accent-foreground`; replaced
    `border-[#faa916]/50` with `border-accent/50`.
  * `src/components/admin/LoginForm.tsx`: replaced `bg-gradient-to-br
    from-[#0f4a50] via-primary to-[#0f4a50]` with `from-primary/90 via-primary
    to-primary/90`; replaced `bg-[#faa916]` blur circles with `bg-accent`;
    replaced `text-[#7a5200]` alert with `text-accent-foreground`.
  * New `src/components/menu/CategoryGrid.tsx`: responsive grid
    (2 cols mobile → 6 cols xl) of category cards with icon, label, item
    count, click-to-scroll, framer-motion entrance animation, accent corner
    glow on hover.
  * `src/app/page.tsx`: wired CategoryGrid between StickyCategoryNav and
    MenuSection; hidden while searching (uses the same `groups` memo as
    the sticky nav, so counts stay in sync).
  * `README.md`: updated category list (8 → 12) and the derived-theme-tokens
    note.
- QA via `agent-browser`:
  * Home page renders cleanly (HTTP 200); 12 categories in both the sticky
    nav and the new grid; 24 items show under their sections.
  * Clicking a category card smooth-scrolls to its section
    (verified `cat-hotDrinks` ends up at top:120).
  * Search hides the grid and shows the search results section.
  * Mobile (375×800) renders a 2-column grid; desktop (1280×800) renders
    a 6-column grid.
  * Logged in to /admin with admin/admin123 (set via
    `bun scripts/set-admin-password.ts`); changed primary → #AA0000 and
    accent → #00AA00 in the Settings tab, saved, verified all CSS vars
    updated live; restored original brand colors afterward.
  * No console errors, no dev.log runtime errors.
- Lint (`bun run lint`): clean, 0 errors.
- Git:
  * Reverted local-only artifacts (config.json test color change + test
    passwordHash, .zscripts/ runtime drift, db/custom.db).
  * Removed stray PNG files in project root (failed parallel image-gen
    leftovers).
  * Staged 18 files (8 modified, 10 added — 1 component + 8 images + README
    already counted in modified).
  * Committed as `77fe475 feat(menu): expand to 12 categories, fix theme
    tokens, add categories grid` and pushed to `origin/main`
    (lamfood/lamfood.ts). Remote HEAD matches local HEAD.
- Created cron job (ID 430372): kind=`webDevReview`, fixed_rate=900s
  (every 15 min), tz=Asia/Tehran, with the user-specified prompt.

Stage Summary:
- ✅ Categories expanded to 12 (صبحانه، برگر، پیتزا، ساندویچ، پاستا، قهوه،
  نوشیدنی گرم، نوشیدنی سرد، دمنوش، شیک، دسر، نوشیدنی).
- ✅ Admin color-setting bug fixed — every theme token now tracks the
  admin's chosen palette (verified live in browser).
- ✅ "See all categories at once" delivered as the new CategoryGrid section
  above the menu items, complementing the sticky chip rail.
- ✅ Git structure clean — only project changes committed and pushed.
- ✅ webDevReview cron job created (every 15 min).
- Dev server running on port 3000; the user can preview via the right-hand
  Preview Panel ("Open in New Tab" available).

---
Task ID: 2
Agent: main (webDevReview — cron-triggered round 1)
Task: QA the current state via agent-browser, fix any bugs found, then add
new features and styling polish. Mandatory: improve styling with more
details and add more features/functionality.

## Current project status (assessment at start of round)
- Dev server was already running on port 3000 (daemon started in round 1).
- All 4 user-requested tasks from round 1 were complete and pushed (commit
  `77fe475`): 12 categories, theme-tokens bug fix, CategoryGrid, clean git.
- 24 menu items seeded; /admin login works (admin/admin123).
- No build/runtime errors in dev.log.

## QA findings (via agent-browser + VLM)
- ✅ Working: 12 categories in sticky nav + grid, search (hides grid), basket
  (correct math: 200+170+85 = 455), admin login, items manager (24 items),
  settings/color picker, mobile (2-col grid).
- ⚠️ Issues found:
  1. **Accessibility regression**: `--muted-foreground` was `#8c8374` on
     `#E8EEF2` background → contrast ratio only **3.2:1**, failing WCAG AA
     (≥4.5:1 required). Affected item descriptions, search hint, badges.
  2. **Sticky nav active state** relied on color only (no ring/shadow), hard
     to distinguish on colorblind or low-contrast screens.
  3. **Featured cards had inconsistent heights** in the rail (descriptions of
     varying length → jagged bottom edge). [Detected after first iteration.]
  4. VLM noted general polish gaps (touch-target affordance, FAB clearance).
     Not blockers; addressed where cheap.

## Goals / completed modifications / verification

### Bug fixes
- **muted-foreground WCAG AA**: bumped mixToHex weight 0.55 → 0.72 in
  `ThemeProvider.applyTheme()`. Verified: new color `#6f624d` on `#E8EEF2` =
  **5.08:1** (PASS). Item descriptions are now comfortably readable.
- **Sticky nav active state**: chip now uses `shadow-md + ring-2 ring-primary/30
  + small accent dot` for active, and `ring-1 ring-transparent + hover:ring-border`
  for inactive — multi-cue differentiation (not color-only).

### New features (mandatory)
1. **`featured` schema column + admin curation**:
   - `prisma/schema.prisma`: added `featured Boolean @default(false)` +
     `@@index([featured])`.
   - `scripts/seed.ts`: marked 6 items as `featured: true` (one per main
     category — صبحانه ایرانی، چیزبرگر مخصوص لم، پیتزا پپرونی، لاته،
     میلک‌شیک شکلاتی، کیک شکلاتی مذاب).
   - `src/lib/types.ts` + `src/app/api/admin/items/route.ts`: expose
     `featured` on `MenuItemDTO` and the create/update zod schema.
   - `src/components/admin/ItemsManager.tsx`: per-item "پیشنهاد شف" switch
     (calls the same PUT endpoint, preserves every other field so toggling
     one flag doesn't wipe the other — verified round-trip 6→5→6).
   - `src/components/admin/ItemForm.tsx`: "پیشنهاد شف" Switch in a 2-col
     row alongside "نمایش در منو".
2. **FeaturedSection** (`src/components/menu/FeaturedSection.tsx`):
   horizontally-scrolling "پیشنهاد شف" rail above the categories grid. Cards
   stretch to equal heights (verified 381.5px each), accent ribbon, click image
   or title to open details, inline add-to-basket stepper. Hidden while searching.
3. **ItemDetailsDialog** (`src/components/menu/ItemDetailsDialog.tsx`):
   full-screen-friendly Radix Dialog. 16:9 preview image, full description
   (no line-clamp), category badge, large price block, large qty stepper,
   "this item in your basket" summary when qty > 0. Closes via Escape/backdrop/X.
   `key={item.id}` forces remount so image/scroll state doesn't leak.
4. **ItemCard clickable** (`src/components/menu/MenuSection.tsx`): image and
   title now `<button>` elements that open the details dialog. Hover hint
   "مشاهدهٔ جزئیات" overlays the image. Featured items get the "پیشنهاد شف"
   ribbon on the regular menu card too. Same wiring applied to search results.
5. **BackToTop** (`src/components/menu/BackToTop.tsx`): floating bottom-right
   button, appears after scrolling past ~90% of viewport. Smooth-scrolls to
   top. Stays clear of FloatingBasket (which is bottom-center on mobile,
   bottom-left on desktop).

### Styling polish (mandatory)
- All featured cards equal height (items-stretch + flex-col + h-full).
- ItemCard hover: `-translate-y-0.5 + shadow-xl` for a subtle lift.
- Section headings: added `scroll-mt-24` so anchor jumps (`#cat-*`) don't hide
  the heading behind the sticky nav.
- Featured card "پیشنهاد شف" ribbon: always-visible, accent-colored, with
  Sparkles icon — works regardless of image content.
- Sticky nav: active chip now multi-cue (color + shadow + ring + dot).

### Verification
- Lint: `bun run lint` → 0 errors.
- Endpoints: `GET /` 200, `GET /admin` 200, `GET /api/menu` 200 (returns 24
  items, 6 with `featured: true`).
- agent-browser:
  * Home: featured section renders 6 cards; clicking featured image opens
    details dialog; add-to-basket inside dialog works (basket badge 3→4).
  * Item card click (regular menu + search results) opens details dialog.
  * Escape closes dialog.
  * Admin ItemsManager: each item shows BOTH "فعال در منو" and "پیشنهاد شف"
    switches; toggle round-trips 6→5→6 in /api/menu.
  * ItemForm: shows the new "پیشنهاد شف" Switch.
  * Back-to-top button appears after scrolling, hidden at top.
  * Mobile (375×800): featured rail is horizontally scrollable with snap.
  * No console errors, no page errors.

## Commit & push
- Commit `1093f98 feat(menu): add featured items, item details dialog,
  back-to-top; polish styling` (13 files, +734 / -61).
- Pushed to `origin/main` (lamfood/lamfood.ts). Remote HEAD matches local.

## Unresolved issues / risks & next-phase recommendations
1. **WhatsApp checkout is still a "build-the-URL and open wa.me" pattern**
   — no order tracking, no order ID, no server-side persistence. If the user
   wants a real ordering flow, the next round could add an `Order` model and
   a tiny order-submit API, then have the admin panel show recent orders.
2. **No analytics / popularity data** — the "featured" flag is admin-curated.
   A future round could add a per-item view/add counter and surface
   "محبوب‌ترین‌ها" automatically.
3. **No item options/addons** — e.g. burger size, extra cheese, spiciness.
   Would need a related `ItemOption` model and a more complex basket line.
4. **No dark-mode toggle on the public menu** — `globals.css` already has
   `.dark` variants but the menu never toggles them. Adding a
   `next-themes` toggle + sun/moon button in the sticky nav would be cheap.
5. **ItemForm image upload** requires the user to pick a file or paste a URL;
   there's no image-pick-from-existing-uploads flow. A media library browser
   would be a nice touch.
6. **Search is name/description only** — could add category filtering and
   sorting (price asc/desc, popularity).

Recommended priority for the next 15-min round: pick #4 (dark mode toggle) or
#6 (search filters) — both are scoped, user-visible, and don't require schema
migrations.
