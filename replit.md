# Shopgram

A mobile-first e-commerce platform that turns Instagram seller profiles into fully functional online stores with UPI payment collection and order management.

## Run & Operate

- `pnpm --filter @workspace/shopy run dev` — run the main React app (uses `$PORT`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `DATABASE_URL` — Postgres connection string (Supabase direct connection)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS 4, Wouter, TanStack Query v5
- UI: Radix UI, Lucide React, Framer Motion
- Forms: React Hook Form + Zod
- Backend: Supabase (Auth, PostgreSQL, Storage) + Express 5
- DB: Drizzle ORM
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/shopy` — main React application (storefront + seller dashboard + admin)
- `artifacts/api-server` — Express backend (health checks, extensible logic)
- `artifacts/mockup-sandbox` — isolated UI component dev/preview environment
- `lib/db` — Drizzle ORM schema (source of truth for DB structure)
- `lib/api-spec` — OpenAPI 3.1 spec (source of truth for API contracts)
- `lib/api-client-react` — generated TanStack Query hooks + Zod schemas

## Architecture decisions

- Supabase handles auth for both sellers and buyers (dual-track auth)
- Frontend talks directly to Supabase for most reads/writes; Express API server is for complex server-side logic
- UPI payments are peer-to-peer (no platform fee) — buyer uploads payment screenshot or UTR as proof
- Subdomain routing: `storename.shopgram.in` serves each seller's storefront
- Products support up to 4 images, stored in Supabase Storage

## Product

- **Sellers** sign up, create a store, upload products, and set their UPI details; once admin-approved their store goes live
- **Buyers** visit a seller's storefront, pick products, fill their address, and complete a UPI payment with proof upload
- **Sellers** manage incoming orders (confirm/decline) from their dashboard
- **Admins** review and approve/suspend shops via the admin panel

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Vite env vars must be prefixed with `VITE_` to be accessible in the frontend
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec
- Subdomain routing logic needs to be accounted for in dev (uses hostname detection)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Supabase project: `rufteftxlqzqobtaxhpg`
