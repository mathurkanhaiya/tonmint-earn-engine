import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  id: number;
  ad_reward_mint: number;
  farming_reward_mint: number;
  farming_cycle_hours: number;
  tap_reward_mint: number;
  max_energy: number;
  referral_usdt: number;
  referral_l1_percent: number;
  referral_l2_percent: number;
  referral_l3_percent: number;
  min_withdrawal_ton: number;
  withdrawal_fee_percent: number;
  mint_ton_rate: number;
  usdt_ton_rate: number;
}

const DEFAULTS: AppSettings = {
  id: 1,
  ad_reward_mint: 15,
  farming_reward_mint: 30,
  farming_cycle_hours: 3,
  tap_reward_mint: 1,
  max_energy: 50,
  referral_usdt: 0.02,
  referral_l1_percent: 10,
  referral_l2_percent: 5,
  referral_l3_percent: 2.5,
  min_withdrawal_ton: 0.1,
  withdrawal_fee_percent: 3,
  mint_ton_rate: 10000,
  usdt_ton_rate: 6.5,
};

interface AppSettingsState {
  settings: AppSettings;
  loaded: boolean;
  fetch: () => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useAppSettings = create<AppSettingsState>((set) => ({
  settings: DEFAULTS,
  loaded: false,

  fetch: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (data && !error) {
      set({ settings: { ...DEFAULTS, ...data }, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new) {
            set({ settings: { ...DEFAULTS, ...payload.new as AppSettings } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
