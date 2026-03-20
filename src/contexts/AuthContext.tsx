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
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  telegramUser: TelegramUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Check if running inside Telegram WebApp
function getTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setProfile(data as Profile);
    }
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
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlocks
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

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        fetchProfile(existingSession.user.id);
        checkAdmin(existingSession.user.id);
      }

      // Try Telegram WebApp auth
      const tgWebApp = getTelegramWebApp();
      if (tgWebApp?.initData && !existingSession) {
        authenticateWithTelegram(tgWebApp.initData, tgWebApp.initDataUnsafe?.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const authenticateWithTelegram = async (initData: string, tgUser: any) => {
    try {
      if (tgUser) {
        setTelegramUser({
          id: tgUser.id,
          username: tgUser.username || '',
          first_name: tgUser.first_name || '',
          photo_url: tgUser.photo_url || '',
        });
      }

      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData },
      });

      if (error) throw error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    } catch (err) {
      console.error('Telegram auth failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        telegramUser,
        isAdmin,
        isLoading,
        isAuthenticated: !!session,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
