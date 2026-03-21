const CACHE_KEY = 'tonmint_profile_cache';

interface CachedProfile {
  mint_balance: number;
  usdt_balance: number;
  ton_balance: number;
  energy: number;
  max_energy: number;
  total_taps: number;
  total_ads_watched: number;
  farming_started_at: string | null;
  farming_claimed_at: string | null;
  referral_count: number;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_photo_url: string | null;
  display_name: string | null;
}

export function loadProfileCache(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as CachedProfile;
  } catch {}
  return null;
}

export function saveProfileCache(profile: CachedProfile): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearProfileCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}
