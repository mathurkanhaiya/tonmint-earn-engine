// Token icon URLs
export const TOKEN_ICONS = {
  TON: "https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1774025032244-b83509e3.png",
  USDT: "https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1774025041026-a79b84fc.png",
  MINT: "https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1774025046524-43d0101e.png",
};

export const FARMING_CYCLE_MS = 3 * 60 * 60 * 1000;
export const FARMING_REWARD = 30;
export const MAX_ENERGY = 50;
export const ENERGY_REFILL_TIME_MS = 10 * 60 * 1000;
export const TAP_REWARD = 1;

export const BOOST_REFILL_AMOUNT = 10;
export const BOOST_REFILL_MS = 60 * 60 * 1000;

export const DAILY_DROP_REWARDS = [5, 10, 15, 20, 25, 35, 50];

export const AD_PROVIDERS = [
  { id: "adsgram", name: "Adsgram", reward: 15 },
  { id: "monetag", name: "Monetag", reward: 15 },
  { id: "gigapub", name: "Gigapub", reward: 15 },
] as const;

export const REFERRAL_LEVELS = [
  { level: 1, commission: 10 },
  { level: 2, commission: 5 },
  { level: 3, commission: 2.5 },
] as const;

export const WITHDRAWAL_MIN_TON = 0.1;
export const WITHDRAWAL_FEE_PERCENT = 3;
