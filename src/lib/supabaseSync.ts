import { supabase } from '@/integrations/supabase/client';

let tapTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingTapState: { mintBalance: number; energy: number; totalTaps: number } | null = null;

export async function syncTap(
  userId: string,
  mintBalance: number,
  energy: number,
  totalTaps: number
) {
  pendingTapState = { mintBalance, energy, totalTaps };
  if (tapTimeout) clearTimeout(tapTimeout);
  tapTimeout = setTimeout(async () => {
    if (!pendingTapState) return;
    await supabase
      .from('profiles')
      .update({
        mint_balance: pendingTapState.mintBalance,
        energy: pendingTapState.energy,
        total_taps: pendingTapState.totalTaps,
      })
      .eq('user_id', userId);
    pendingTapState = null;
  }, 1000);
}

export async function syncStartFarming(userId: string) {
  await supabase
    .from('profiles')
    .update({ farming_started_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function syncClaimFarming(userId: string, newMintBalance: number) {
  await supabase
    .from('profiles')
    .update({
      mint_balance: newMintBalance,
      farming_started_at: null,
      farming_claimed_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

export async function syncMintBalance(userId: string, newMintBalance: number) {
  await supabase
    .from('profiles')
    .update({ mint_balance: newMintBalance })
    .eq('user_id', userId);
}

export async function syncSwap(
  userId: string,
  fromToken: 'MINT' | 'USDT',
  fromAmount: number,
  toTon: number,
  newMintBalance: number,
  newUsdtBalance: number,
  newTonBalance: number
) {
  await supabase
    .from('profiles')
    .update({
      mint_balance: newMintBalance,
      usdt_balance: newUsdtBalance,
      ton_balance: newTonBalance,
    })
    .eq('user_id', userId);
}

export async function syncWatchAd(
  userId: string,
  provider: string,
  reward: number,
  newMintBalance: number,
  newEnergy: number,
  totalAdsWatched: number
) {
  await Promise.all([
    supabase
      .from('profiles')
      .update({
        mint_balance: newMintBalance,
        energy: newEnergy,
        total_ads_watched: totalAdsWatched,
      })
      .eq('user_id', userId),
    supabase.from('ad_watches').insert({
      user_id: userId,
      provider,
      reward_mint: reward,
    }),
  ]);
}

export async function syncBoostUsed(
  userId: string,
  newBoostCount: number,
  newEnergy: number,
  source: string = 'tap'
) {
  await Promise.all([
    supabase.from('profiles').update({
      boost_count: newBoostCount,
      boost_last_refill_at: new Date().toISOString(),
    }).eq('user_id', userId),
    supabase.from('boost_usage').insert({
      user_id: userId,
      boosts_used: 1,
      source,
    }).catch(() => {}),
  ]);
}

export async function syncBoostFromAd(
  userId: string,
  newBoostCount: number,
  newMintBalance: number,
  newEnergy: number,
  totalAdsWatched: number,
  source: 'boost_percent' | 'boost_refill'
) {
  await Promise.all([
    supabase.from('profiles').update({
      boost_count: newBoostCount,
      mint_balance: newMintBalance,
      energy: newEnergy,
      total_ads_watched: totalAdsWatched,
    }).eq('user_id', userId),
    supabase.from('ad_watches').insert({
      user_id: userId,
      provider: source,
      reward_mint: 0,
    }).catch(() => {}),
  ]);
}

export async function redeemPromoCode(userId: string, code: string): Promise<{ success: boolean; reward: number; error?: string }> {
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, reward_mint, is_active, max_uses, current_uses')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (!promo) return { success: false, reward: 0, error: 'Invalid code' };
  if (!promo.is_active) return { success: false, reward: 0, error: 'Code is inactive' };
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return { success: false, reward: 0, error: 'Code has reached its limit' };
  }

  const { error: dupError } = await supabase
    .from('promo_redemptions')
    .insert({ user_id: userId, promo_code_id: promo.id });

  if (dupError) return { success: false, reward: 0, error: 'Code already used' };

  await supabase
    .from('promo_codes')
    .update({ current_uses: promo.current_uses + 1 })
    .eq('id', promo.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('mint_balance')
    .eq('user_id', userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ mint_balance: Number(profile.mint_balance) + Number(promo.reward_mint) })
      .eq('user_id', userId);
  }

  return { success: true, reward: Number(promo.reward_mint) };
}
