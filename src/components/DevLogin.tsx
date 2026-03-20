import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

function getTelegramWebApp() {
  if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // auto create if missing
    if (!data) {
      await supabase.from("profiles").insert({ user_id: userId });
      return fetchProfile(userId);
    }

    setProfile(data as Profile);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const tg = getTelegramWebApp();

        if (!tg || !tg.initData || !tg.initDataUnsafe?.user) {
          console.error("❌ Not inside Telegram Mini App");
          setIsLoading(false);
          return;
        }

        // ✅ REQUIRED
        tg.ready();
        tg.expand();

        const tgUser = tg.initDataUnsafe.user;

        setTelegramUser({
          id: tgUser.id,
          username: tgUser.username || "",
          first_name: tgUser.first_name || "",
          photo_url: tgUser.photo_url || "",
        });

        // ✅ reuse session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const { data, error } = await supabase.functions.invoke("telegram-auth", {
            body: { initData: tg.initData },
          });

          if (error) throw error;

          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        // ✅ get user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (currentUser) {
          setUser(currentUser);
          await fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        telegramUser,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}