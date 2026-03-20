import BalanceHeader from "@/components/BalanceHeader";
import TapButton from "@/components/TapButton";
import FarmingCard from "@/components/FarmingCard";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { telegramUser } = useAuth();

  return (
    <div className="flex flex-col items-center px-4 pb-24 min-h-screen">

      {/* Header */}
      <div className="w-full flex items-center justify-between pt-6 pb-2">

        {/* App Title */}
        <h1 className="text-xl font-bold tracking-tight">
          Ton<span className="text-mint">Mint</span>
        </h1>

        {/* 👤 Telegram User */}
        {telegramUser && (
          <div className="flex items-center gap-2">
            <img
              src={telegramUser.photo_url || "/default-avatar.png"}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-xs font-medium">
              {telegramUser.first_name}
            </span>
          </div>
        )}

      </div>

      {/* Balance */}
      <BalanceHeader />

      {/* Tap Button */}
      <div className="mt-6">
        <TapButton />
      </div>

      {/* Farming */}
      <div className="w-full mt-8 max-w-sm">
        <FarmingCard />
      </div>

      {/* Footer Text */}
      <p
        className="text-[11px] text-muted-foreground mt-6 text-center animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        Every tap = $MINT earned. Keep grinding.
      </p>
    </div>
  );
}