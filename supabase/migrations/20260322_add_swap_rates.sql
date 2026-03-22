-- Add swap rate columns to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS mint_ton_rate NUMERIC NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS usdt_ton_rate NUMERIC NOT NULL DEFAULT 6.5;
