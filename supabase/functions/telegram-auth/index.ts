import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface TelegramUser {
  id: number;
  username: string;
  first_name: string;
  photo_url: string;
}

interface Profile {
  id: string;
  user_id: string;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_photo_url: string | null;
  display_name: string | null;
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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  telegramUser: TelegramUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  telegramUser: null,
  isAdmin: false,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ✅ Telegram WebApp helper
function getTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Fetch profile
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) setProfile(data as Profile);
  };

  // 🔥 Check admin
  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  // 🚀 MAIN TELEGRAM AUTH FLOW
  useEffect(() => {
    const initTelegramAuth = async () => {
      try {
        const tgWebApp = getTelegramWebApp();

        if (!tgWebApp || !tgWebApp.initData) {
          console.warn('Not inside Telegram WebApp');
          setIsLoading(false);
          return;
        }

        const tgUser = tgWebApp.initDataUnsafe?.user;

        // ✅ Save Telegram user locally
        if (tgUser) {
          setTelegramUser({
            id: tgUser.id,
            username: tgUser.username || '',
            first_name: tgUser.first_name || '',
            photo_url: tgUser.photo_url || '',
          });
        }

        // ✅ Send initData to backend
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: { initData: tgWebApp.initData },
        });

        if (error) throw error;

        // ✅ Set Supabase session
        if (data?.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          // ✅ Get authenticated user
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();

          if (currentUser) {
            setUser(currentUser);
            await fetchProfile(currentUser.id);
            await checkAdmin(currentUser.id);
          }
        }
      } catch (err) {
        console.error('Telegram auth failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initTelegramAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        telegramUser,
        isAdmin,
        isLoading,
        isAuthenticated: !!user,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}