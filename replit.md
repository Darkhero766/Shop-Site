# Shopy

A multi-tenant SaaS platform for Indian Instagram micro-sellers to create their own storefront with a unique subdomain, upload products, accept UPI payments, and collect verified buyer reviews.

## Run & Operate

- `pnpm --filter @workspace/shopy run dev` — run the frontend (auto-started via workflow)
- `pnpm --filter @workspace/shopy run typecheck` — typecheck the frontend
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, minimal usage)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend/DB/Auth/Storage: Supabase (PostgreSQL + Auth + Storage)
- Routing: Wouter (with subdomain detection logic)
- Forms: react-hook-form + zod
- Notifications: Sonner toasts + WhatsApp deep links
- Image carousel: embla-carousel-react
- Bottom sheet: vaul Drawer

## Where things live

- `artifacts/shopy/src/` — entire frontend application
- `artifacts/shopy/src/lib/supabase.ts` — Supabase client, types, helpers
- `artifacts/shopy/src/pages/` — all pages (HomePage, JoinPage, ShopPage, DashboardPage, AdminPage, LoginPage)
- `artifacts/shopy/src/components/` — shared components (ProductCard, ProductDrawer, ReviewSection, UTRForm, StarRating, SkeletonGrid, ImageUpload)
- `artifacts/shopy/src/index.css` — full design system / theme (purple primary #7C3AED, emerald accent #10B981)

## Architecture decisions

- **Supabase-only backend**: No Express API routes needed. All data ops (auth, CRUD, storage uploads) go directly from the React frontend to Supabase using the anon key + RLS policies.
- **Subdomain routing**: `getSubdomainFromHost()` in `src/lib/supabase.ts` parses `window.location.hostname`. If a subdomain is found, `App.tsx` renders `<ShopPage slug={...} />` instead of the normal router. Use `?shop=slug` query param for local dev testing.
- **No payment gateway**: UPI QR + UTR verification is the payment flow. Buyers scan QR, pay, submit 12-digit UTR, seller confirms.
- **Review gating**: Reviews require a valid UTR that matches an existing order for that shop and has no review yet.
- **Admin by email**: Admin panel checks `user.email === import.meta.env.VITE_ADMIN_EMAIL` client-side.

## Product

- **Homepage** (`/`): Marketing page with hero, features, how-it-works
- **Seller Signup** (`/join`): 3-step form — basic info + subdomain availability check, products & UPI QR upload, preview & launch
- **Shop Page** (subdomain): Public storefront — product grid, product drawer with image carousel, UPI payment section, UTR order form, verified reviews
- **Seller Dashboard** (`/dashboard`): Overview stats, products CRUD, orders confirm/decline, reviews view, settings
- **Admin Panel** (`/admin`): Approve/suspend shops, view stats (admin email gated)
- **Login** (`/login`): Supabase email+password auth

## User preferences

- Tech stack locked: React + Vite + Supabase + Tailwind + shadcn/ui
- No payment gateway (UPI QR only)
- No SSR, static-export friendly (Vercel target)
- WhatsApp deep links only (no external notification APIs)
- Currency always ₹, integer only
- UTR always 12 digits numeric

## Deploying to external platforms

The app is a pure static SPA (React + Vite). There is no Node.js server needed in production — only Supabase.

**Required environment variables (set in your platform dashboard):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAIL=admin@example.com
```
A template is provided in `.env.example`.

**Vercel** — import the repo, Vercel auto-detects `vercel.json`. Set the three env vars in Project → Settings → Environment Variables. Done.

**Netlify** — import the repo, Netlify auto-detects `netlify.toml`. Set the three env vars in Site → Environment Variables. Done.

**Any static host (GitHub Pages, Cloudflare Pages, etc.):**
- Build command: `pnpm --filter @workspace/shopy run build`
- Output directory: `artifacts/shopy/dist/public`
- Set `BASE_PATH=/` as a build env var
- Configure all routes to serve `index.html` (SPA fallback)

**Subdomain routing in production:** Each seller shop lives at `<slug>.shopgram.in`. Configure wildcard DNS (`*.shopgram.in`) pointing to your host. The app auto-detects the subdomain and renders the correct shop. For local dev, use `?shop=<slug>`.

## Gotchas

- Supabase tables must have RLS enabled with correct policies before the app works end-to-end
- Supabase Storage buckets needed: `product-images` and `upi-qr` (both public read, authenticated write)
- The SQL schema must be run in Supabase SQL editor — see original spec for 4 tables: shops, products, orders, reviews
- Subdomain detection won't work on Replit preview (same domain) — use `?shop=subdomain` for local testing
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAIL` must be set as secrets

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Supabase SQL schema: run in Supabase dashboard → SQL Editor
