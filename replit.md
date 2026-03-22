# TonMint — Telegram Mini App

A tap-to-earn Telegram Mini App where users earn $MINT tokens by tapping, farming, watching ads, completing tasks, and referring friends. Tokens can be swapped or withdrawn as TON.

## Architecture

- **Frontend**: React + Vite + TailwindCSS + shadcn/ui (TypeScript)
- **Backend**: Express.js API server (api-server.mjs) — handles Telegram auth verification & bot notifications
- **Database**: Supabase (PostgreSQL) — auth, profiles, tasks, withdrawals, referrals, promo codes
- **State**: Zustand (client-side store synced with Supabase)
- **Bot**: Telegram Bot API — automated notifications via the backend

## Running

- **Dev**: `npm run dev` — starts both Vite (port 5000) and Express API server (port 5001) in parallel
- **Production**: `npm run build` then `node server.mjs` — serves built files + API on port 5000

## Key Files

- `api-server.mjs` — Express backend: Telegram auth, bot notifications, daily drop claim, task notifications
- `server.mjs` — Production server: static files + API endpoints
- `src/contexts/AuthContext.tsx` — Telegram WebApp auth flow
- `src/lib/store.ts` — Zustand store (balances, energy, boosts, daily drop)
- `src/lib/supabaseSync.ts` — Debounced Supabase sync functions
- `src/lib/appSettings.ts` — Real-time app settings via Supabase
- `src/pages/` — All page components
- `src/components/` — BalanceHeader, TapButton, FarmingCard, DailyDropCard, BottomNav
- `supabase/migrations/` — Database schema migrations

## Features

1. **Tap to Earn** — Tap button earns $MINT, uses energy
2. **Daily Drop** — Day 1–7 streak rewards (5→10→15→20→25→35→50 $MINT)
3. **Farming** — 3-hour cycle earns 30 $MINT
4. **Boost System** — 10 boosts/hour cooldown, watch ads for extra boosts
5. **Tasks** — Admin-managed tasks fetched from DB, tracked in user_tasks
6. **Ads** — Watch ads to earn $MINT and refill energy
7. **Promo Codes** — Admin-set exact reward amounts
8. **Referral System** — Multi-level (L1/L2/L3), bot notifications when complete
9. **Wallet** — Swap $MINT/USDT → TON, withdraw TON with admin approval
10. **Admin Panel** — User activity, task management, promo codes, withdrawals, bot broadcasts
11. **Bot Notifications** — Welcome, farming complete, boost ready, daily drop, task announcement, daily reminder

## Required Secrets

- `TELEGRAM_BOT_TOKEN` — From @BotFather, used server-side for auth + notifications
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for admin operations
- `VITE_SUPABASE_URL` — Public Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Public Supabase anon key

## Database Tables (Supabase)

- `profiles` — User data, balances, energy, boost, daily drop
- `tasks` — Admin-managed tasks
- `user_tasks` — Task completion tracking
- `referrals` — Multi-level referral links
- `promo_codes` / `promo_redemptions` — Promo code management
- `withdrawals` — TON withdrawal requests
- `ad_watches` — Ad viewing history
- `app_settings` — Global settings (rates, rewards, fees)
- `daily_drops` — Daily drop claim history
- `boost_usage` — Boost usage log
- `user_activity` — Full activity log for admin panel
- `bot_notifications` — Sent notification log
