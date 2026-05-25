# AGENT.md - PT. Ulu Plastik Latersia PWA

> **Last Updated:** 2026-05-20
> **Current Phase:** ✅ Project Complete

---

## 1. Tech Stack & Configuration

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + Vite | React 19, Vite 8 |
| **Language** | TypeScript | ES2023 target |
| **Styling** | Tailwind CSS v4 + Shadcn/UI (Nova/Radix) | v4.1 |
| **Routing** | React Router DOM | v7 |
| **Fonts** | Inter Variable (UI) + JetBrains Mono Variable (numbers) | Variable fonts |
| **Icons** | Lucide React | Latest |
| **Database** | Turso (SQLite Edge) + @libsql/client | v0.17 |
| **ORM** | Drizzle ORM + Drizzle Kit | v0.45 |
| **Deployment** | Cloudflare Pages (Free Plan) | *Not yet configured* |

### Path Aliases
- `@/*` → `./src/*`

### Key Configuration Files
- `vite.config.ts` — Vite + Tailwind plugin + path alias
- `tsconfig.app.json` — TypeScript with path aliases
- `components.json` — Shadcn/UI config (Nova preset, Radix, CSS variables)

---

## 2. Database Schema

**Status:** ✅ Defined & Migration Generated

### Tables

#### `categories` (4 columns)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| name | TEXT | plastic category name |
| module_type | TEXT | 'kering' \| 'kecil' \| 'luar' |
| created_at | INTEGER | unix ms timestamp |

#### `inventory` (5 columns, 1 unique index, 1 FK)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| category_id | INTEGER FK | → categories.id |
| stock_type | TEXT | 'raw' \| 'processed' |
| current_stock | REAL | kg, default 0 |
| updated_at | INTEGER | unix ms timestamp |

**UNIQUE INDEX:** `(category_id, stock_type)` — one row per category per type

#### `transactions` (9 columns, 2 FKs)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| category_id | INTEGER FK | → categories.id |
| stock_type | TEXT | 'raw' \| 'processed' |
| transaction_type | TEXT | 'in' \| 'out' \| 'production_out' \| 'production_in' \| 'mix_out' |
| weight | REAL | kg, always positive |
| notes | TEXT | nullable |
| batch_id | INTEGER FK | → oplosan_batches.id (nullable) |
| reference_group | TEXT | groups related txns (e.g. production pair) |
| created_at | INTEGER | unix ms timestamp |

#### `oplosan_batches` (5 columns)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| batch_name | TEXT | nullable |
| total_weight | REAL | sum of all components |
| notes | TEXT | nullable |
| created_at | INTEGER | unix ms timestamp |

### Inventory Rows per Module
- **Kering**: 18 categories × 2 types (raw + processed) = **36 rows**
- **Kecil**: 4 categories × 2 types = **8 rows**
- **Luar**: 3 categories × 1 type (processed only) = **3 rows**
- **Total inventory rows:** 47

---

## 3. Design System

### Color Palette (Outdoor-Optimized)
- **Background:** Warm off-white slate (`oklch(0.965 0.003 250)`)
- **Foreground:** Near-black (`oklch(0.15 0.01 260)`) — max contrast for sunlight
- **Primary:** Teal-green (`oklch(0.45 0.15 160)`) — recycling theme
- **Destructive:** Red for errors/warnings
- **Dark mode:** Available for indoor/night use

### Typography
- **UI Text:** Inter Variable (sans-serif)
- **Numeric Data:** JetBrains Mono Variable (monospace, larger sizing)
  - `.font-numeric` — 1.125rem, 600 weight
  - `.font-numeric-lg` — 1.5rem, 700 weight
  - `.font-numeric-xl` — 2rem, 800 weight

### Touch Targets
- Minimum 48px height/width (`.touch-target` class)
- Safe area bottom padding for mobile

---

## 4. Project Structure

```
produksi-gilingan/
├── index.html                    # PWA-ready HTML shell
├── public/
│   └── favicon.svg               # Recycling-themed favicon
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Router setup (4 routes)
│   ├── index.css                 # Design system (Tailwind v4 + custom tokens)
│   ├── components/
│   │   ├── layout/
│   │   │   └── app-layout.tsx    # Shell with bottom nav (mobile) + sidebar (desktop)
│   │   └── ui/                   # Shadcn/UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── dialog.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── badge.tsx
│   │       ├── separator.tsx
│   │       ├── scroll-area.tsx
│   │       └── sheet.tsx
│   ├── lib/
│   │   └── utils.ts              # Shadcn cn() utility
│   └── pages/
│       ├── gilingan-kering.tsx   # Placeholder with 18 categories
│       ├── gilingan-kecil.tsx    # Placeholder with 4 categories
│       ├── gilingan-luar.tsx     # Placeholder with 3 categories
│       └── oplosan.tsx           # Placeholder (mixing module)
│   └── db/
│       ├── schema.ts             # Drizzle ORM schema (4 tables)
│       ├── index.ts              # DB connection (libsql client)
│       └── seed.ts               # Category & inventory seeding
├── drizzle/
│   └── 0000_safe_wasp.sql        # Initial migration
├── drizzle.config.ts             # Drizzle Kit config for Turso
├── .env.example                  # Turso credentials template
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── components.json               # Shadcn/UI config
└── AGENT.md                      # This file
```

---

## 5. Completed Features

### Step 1 ✅ — Project Initialization
- [x] Vite + React + TypeScript scaffolding
- [x] Tailwind CSS v4 with `@tailwindcss/vite` plugin
- [x] Shadcn/UI (Nova preset, Radix base) with 12 components
- [x] Custom outdoor-optimized color palette (soft bg, high contrast text)
- [x] Inter + JetBrains Mono variable fonts
- [x] Numeric typography utility classes
- [x] React Router with 4 module routes
- [x] Responsive app layout (mobile bottom nav + desktop sidebar)
- [x] Placeholder pages for all 4 modules with category badges
- [x] PWA-ready HTML meta tags
- [x] SVG favicon with recycling theme
- [x] Successful build (JS: 89KB gzip, CSS: 12.7KB gzip)

---

## 6. Pending Features / Next Steps

### Step 2 ✅ — Database Schema
- [x] Install Drizzle ORM v0.45 + @libsql/client v0.17 + Drizzle Kit
- [x] Define normalized schema: categories, inventory, transactions, oplosan_batches
- [x] Generate migration SQL (drizzle/0000_safe_wasp.sql)
- [x] Create idempotent seed script (25 categories, 47 inventory rows)
- [x] Added npm scripts: db:generate, db:push, db:migrate, db:seed, db:studio
- [x] Created .env.example template for Turso credentials
- [ ] ⏳ User needs to create Turso DB and add credentials to .env
- [ ] ⏳ Run `npm run db:push` then `npm run db:seed` after .env is configured

### Step 3 ✅ — API Routes
- [x] CRUD for bahan baku (raw materials) via `POST /api/transactions/in`
- [x] CRUD for hasil produksi via `POST /api/transactions/production`
- [x] Stock calculation logic via atomic SQLite transactions
- [x] Oplosan mixing logic via `POST /api/transactions/oplosan`
- [x] Built using Hono deployed to Cloudflare Pages Functions (`functions/api/[[route]].ts`)
- [x] Exposed `GET /api/inventory` and `GET /api/categories` for UI consumption

### Step 4 ✅ — UI: Gilingan Kering & Kecil
- [x] Input forms for bahan baku (with confirmation dialog)
- [x] Input forms for hasil produksi (with confirmation dialog)
- [x] Data tables with sorting (using font-numeric for readability)
- [x] Real-time stock display (status cards)
- [x] Shadcn Toaster integration for success/error alerts

### Step 5 ✅ — UI: Gilingan Luar & Oplosan
- [x] Direct input form for Gilingan Luar (processed stock only)
- [x] Multi-select dynamic mixing form for Oplosan
- [x] Cross-module stock deduction UI with real-time stock validation
- [x] Comprehensive confirmation dialog for mixing multiple items

### Step 6 ✅ — PWA Configuration
- [x] Web manifest (manifest.json via vite-plugin-pwa)
- [x] Service worker for offline/caching of static assets
- [x] App icons for different sizes (192x192, 512x512)
- [x] Install prompt & iOS apple-touch-icon compatibility

---

## 🎉 Project Completion Status
All 6 steps have been successfully implemented. The application is now a fully functional Progressive Web App ready for deployment to Cloudflare Pages.

**Next deployment steps for the user:**
1. Create Turso Database and update `.env` (then run `npm run db:push` and `npm run db:seed`)
2. Connect GitHub repository to Cloudflare Pages.
3. Configure `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` in Cloudflare Pages environment variables.
4. Set build command to `npm run build` and output directory to `dist`.

---

## 8. Module Categories Reference

### Gilingan Kering (18 categories)
Metalis Nico, Metalis Nico BR, Metalis Nico BR1, Metalis Nico BR2, Afalan Rafia, Lite Erwan, Metalis Kopi, Prongkalan Suwayuwo, Prongkalan Peletan, Prongkalan Sukorejo, Packing Ulu, Packing Sukorejo, Packing Nasehudin, Metalis BonCabe, Lite Sakson, Lite Tupel, Rafia, Metalis Nissin Tab

### Gilingan Kecil (4 categories)
Metalis Kopi, PP Sablon, Nilon, Metalis BonCabe

### Gilingan Luar (3 categories)
Sruwol Sukorejo, Metalis Nanang, Metalis Dim

### Oplosan
No fixed categories — mixes from all 3 modules above.
