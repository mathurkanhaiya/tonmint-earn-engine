# TonMint

A Telegram Mini App (tap-to-earn / farming game) built with React, Vite, and Supabase.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **State**: Zustand (client state) + TanStack Query (server state)
- **Backend**: Supabase (hosted PostgreSQL + Auth + Edge Functions)
- **Routing**: React Router DOM v6

## Architecture

This is a **pure frontend** app. All backend logic lives in Supabase:
- **Database**: Supabase hosted PostgreSQL (tables: profiles, tasks, user_tasks, referrals, withdrawals, ad_watches, promo_codes, promo_redemptions, app_settings, user_roles)
- **Auth**: Telegram WebApp auth via Supabase Edge Function (`telegram-auth`)
- **Edge Functions**: Deno-based, deployed on Supabase (`supabase/functions/`)

## Entry Points

- `src/main.tsx` — React app entry
- `src/App.tsx` — Root component with routing and providers
- `src/contexts/AuthContext.tsx` — Telegram auth context (calls Supabase edge function)
- `src/integrations/supabase/client.ts` — Supabase JS client

## Key Pages

- `/` — Home: tap button + farming card
- `/ads` — Watch ads to earn MINT + promo codes
- `/tasks` — Complete tasks for MINT rewards
- `/referral` — Referral system
- `/wallet` — Balances + TON withdrawal
- `/admin` — Admin panel (admin-role users only)

## Environment Variables

Set in Replit secrets/env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key

## Running

The app runs via `npm run dev` on port 5000.

## Deployment

Build with `npm run build` → static files in `dist/`. Can be deployed as a static site.

## Notes

- This app is **only functional inside Telegram** (it checks for `window.Telegram.WebApp`)
- The Supabase Edge Function `telegram-auth` must be deployed to the Supabase project
- Token icons are served from Supabase storage
