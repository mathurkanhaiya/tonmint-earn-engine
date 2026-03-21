import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface TelegramUser {
  id: number;
  username: string;
  first_name: string;
  display_name: string;
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
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  telegramUser: TelegramUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTelegramEnv: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  telegramUser: null,
  isAdmin: false,
  isLoading: true,
  isAuthenticated: false,
  isTelegramEnv: false,
  authError: null,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function getTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    const wa = (window as any).Telegram.WebApp;
    // Check that we're actually inside TG, not just the script loaded
    if (wa.initData && wa.initData.length > 0) {
      return wa;
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const tgWebApp = getTelegramWebApp();
  const isTelegramEnv = !!tgWebApp;

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) setProfile(data as Profile);
  };

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
    if (user?.id) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Block non-Telegram environments immediately
    if (!isTelegramEnv) {
      setAuthError('This app can only be used inside Telegram.');
      setIsLoading(false);
      return;
    }

    // Expand TG WebApp
    tgWebApp.expand();
    tgWebApp.ready();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          setTimeout(async () => {
            await fetchProfile(newSession.user.id);
            await checkAdmin(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        fetchProfile(existingSession.user.id);
        checkAdmin(existingSession.user.id);
        setIsLoading(false);
      } else {
        authenticateWithTelegram(tgWebApp.initData);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const authenticateWithTelegram = async (initData: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData },
      });

      if (error) throw error;

      if (data?.user) {
        setTelegramUser({
          id: data.user.telegram_id,
          username: data.user.username || '',
          first_name: data.user.first_name || '',
          display_name: data.user.display_name || '',
          photo_url: data.user.photo_url || '',
        });
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    } catch (err) {
      console.error('Telegram auth failed:', err);
      setAuthError('Authentication failed. Please restart the app.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session, user, profile, telegramUser,
        isAdmin, isLoading, authError, isTelegramEnv,
        isAuthenticated: !!session,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
