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

// ✅ Telegram helper
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

  // ✅ Fetch or create profile
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.warn("Profile not found, creating...");

      await supabase.from("profiles").insert({
        user_id: userId,
      });

      return fetchProfile(userId);
    }

    setProfile(data as Profile);
  };

  useEffect(() => {
    let initialized = false;

    const init = async () => {
      if (initialized) return;
      initialized = true;

      try {
        const tg = getTelegramWebApp();

        if (!tg) {
          console.error("❌ Telegram SDK not found");
          setIsLoading(false);
          return;
        }

        // ✅ REQUIRED
        tg.ready();
        tg.expand();

        // ⏳ WAIT FOR TELEGRAM TO INJECT DATA
        await new Promise((resolve) => setTimeout(resolve, 150));

        const tgUser = tg.initDataUnsafe?.user;

        if (!tgUser) {
          console.error("❌ No Telegram user (open inside Telegram)");
          setIsLoading(false);
          return;
        }

        console.log("✅ Telegram user:", tgUser);

        // ✅ Set Telegram user
        setTelegramUser({
          id: tgUser.id,
          username: tgUser.username || "",
          first_name: tgUser.first_name || "",
          photo_url: tgUser.photo_url || "",
        });

        // ✅ Reuse session if exists
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log("🔐 Logging in via Telegram...");

          const { data, error } = await supabase.functions.invoke("telegram-auth", {
            body: { initData: tg.initData },
          });

          if (error) {
            console.error("❌ Edge function error:", error);
            throw error;
          }

          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        // ✅ Get Supabase user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          console.error("❌ No Supabase user after auth");
          setIsLoading(false);
          return;
        }

        console.log("✅ Supabase user:", currentUser.id);

        setUser(currentUser);

        // ✅ Fetch profile
        await fetchProfile(currentUser.id);
      } catch (err) {
        console.error("❌ Auth error:", err);
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