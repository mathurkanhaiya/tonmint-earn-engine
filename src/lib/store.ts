import { create } from 'zustand';
import { MAX_ENERGY, TAP_REWARD, FARMING_REWARD, FARMING_CYCLE_MS, BOOST_REFILL_AMOUNT, BOOST_REFILL_MS } from './constants';

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
  boost_count?: number;
  boost_last_refill_at?: string | null;
  daily_drop_streak?: number;
  daily_drop_claimed_at?: string | null;
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
  boostCount: number;
  boostLastRefillAt: number | null;
  dailyDropStreak: number;
  dailyDropClaimedAt: number | null;
  isInitialized: boolean;

  initFromProfile: (profile: Profile) => void;
  tap: () => void;
  watchAd: (reward: number) => void;
  startFarming: () => void;
  claimFarming: () => void;
  addMint: (amount: number) => void;
  refillEnergy: (amount: number) => void;
  swapMintToTon: (mintAmount: number, tonAmount: number) => void;
  swapUsdtToTon: (usdtAmount: number, tonAmount: number) => void;
  useBoost: () => boolean;
  addBoosts: (amount: number) => void;
  claimDailyDrop: (streakDay: number, reward: number) => void;
  boostsReady: () => boolean;
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
  boostCount: BOOST_REFILL_AMOUNT,
  boostLastRefillAt: null,
  dailyDropStreak: 0,
  dailyDropClaimedAt: null,
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
      boostCount: profile.boost_count ?? BOOST_REFILL_AMOUNT,
      boostLastRefillAt: profile.boost_last_refill_at
        ? new Date(profile.boost_last_refill_at).getTime()
        : null,
      dailyDropStreak: profile.daily_drop_streak ?? 0,
      dailyDropClaimedAt: profile.daily_drop_claimed_at
        ? new Date(profile.daily_drop_claimed_at).getTime()
        : null,
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

  swapMintToTon: (mintAmount: number, tonAmount: number) => {
    set((state) => ({
      mintBalance: state.mintBalance - mintAmount,
      tonBalance: state.tonBalance + tonAmount,
    }));
  },

  swapUsdtToTon: (usdtAmount: number, tonAmount: number) => {
    set((state) => ({
      usdtBalance: state.usdtBalance - usdtAmount,
      tonBalance: state.tonBalance + tonAmount,
    }));
  },

  useBoost: () => {
    const state = get();
    const now = Date.now();

    // Auto-refill if an hour has passed
    let currentBoosts = state.boostCount;
    let lastRefill = state.boostLastRefillAt;

    if (lastRefill !== null && now - lastRefill >= BOOST_REFILL_MS) {
      currentBoosts = BOOST_REFILL_AMOUNT;
      lastRefill = now;
    }

    if (currentBoosts <= 0) return false;

    set({
      boostCount: currentBoosts - 1,
      boostLastRefillAt: lastRefill ?? now,
      energy: Math.min(state.energy + 10, state.maxEnergy),
    });
    return true;
  },

  addBoosts: (amount: number) => {
    set((state) => ({
      boostCount: Math.min(state.boostCount + amount, 50),
    }));
  },

  claimDailyDrop: (streakDay: number, reward: number) => {
    set((state) => ({
      mintBalance: state.mintBalance + reward,
      dailyDropStreak: streakDay,
      dailyDropClaimedAt: Date.now(),
    }));
  },

  boostsReady: () => {
    const state = get();
    const now = Date.now();
    if (state.boostLastRefillAt === null) return false;
    return now - state.boostLastRefillAt >= BOOST_REFILL_MS;
  },
}));
