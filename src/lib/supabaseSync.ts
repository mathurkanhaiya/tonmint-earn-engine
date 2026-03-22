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
