import { create } from 'zustand';
import { MAX_ENERGY, TAP_REWARD, FARMING_REWARD, FARMING_CYCLE_MS } from './constants';

interface Profile {
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
}

interface UserState {
  mintBalance: number;
  usdtBalance: number;
  tonBalance: number;
  energy: number;
  maxEnergy: number;
  farmingStartedAt: number | null;
  farmingClaimedAt: number | null;
  totalTaps: number;
  totalAdsWatched: number;
  referralCount: number;
  isInitialized: boolean;

  initFromProfile: (profile: Profile) => void;
  tap: () => void;
  watchAd: (reward: number) => void;
  startFarming: () => void;
  claimFarming: () => void;
  addMint: (amount: number) => void;
  refillEnergy: (amount: number) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  mintBalance: 0,
  usdtBalance: 0,
  tonBalance: 0,
  energy: MAX_ENERGY,
  maxEnergy: MAX_ENERGY,
  farmingStartedAt: null,
  farmingClaimedAt: null,
  totalTaps: 0,
  totalAdsWatched: 0,
  referralCount: 0,
  isInitialized: false,

  initFromProfile: (profile: Profile) => {
    set({
      mintBalance: Number(profile.mint_balance) || 0,
      usdtBalance: Number(profile.usdt_balance) || 0,
      tonBalance: Number(profile.ton_balance) || 0,
      energy: profile.energy ?? MAX_ENERGY,
      maxEnergy: profile.max_energy ?? MAX_ENERGY,
      totalTaps: profile.total_taps || 0,
      totalAdsWatched: profile.total_ads_watched || 0,
      referralCount: profile.referral_count || 0,
      farmingStartedAt: profile.farming_started_at
        ? new Date(profile.farming_started_at).getTime()
        : null,
      farmingClaimedAt: profile.farming_claimed_at
        ? new Date(profile.farming_claimed_at).getTime()
        : null,
      isInitialized: true,
    });
  },

  tap: () => {
    const state = get();
    if (state.energy <= 0) return;
    set({
      mintBalance: state.mintBalance + TAP_REWARD,
      energy: state.energy - 1,
      totalTaps: state.totalTaps + 1,
    });
  },

  watchAd: (reward: number) => {
    const state = get();
    set({
      mintBalance: state.mintBalance + reward,
      energy: Math.min(state.energy + 5, state.maxEnergy),
      totalAdsWatched: state.totalAdsWatched + 1,
    });
  },

  startFarming: () => {
    set({ farmingStartedAt: Date.now() });
  },

  claimFarming: () => {
    const state = get();
    if (!state.farmingStartedAt) return;
    const elapsed = Date.now() - state.farmingStartedAt;
    if (elapsed < FARMING_CYCLE_MS) return;
    set({
      mintBalance: state.mintBalance + FARMING_REWARD,
      farmingStartedAt: null,
      farmingClaimedAt: Date.now(),
    });
  },

  addMint: (amount: number) => {
    set((state) => ({ mintBalance: state.mintBalance + amount }));
  },

  refillEnergy: (amount: number) => {
    set((state) => ({ energy: Math.min(state.energy + amount, state.maxEnergy) }));
  },
}));
