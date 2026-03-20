import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { AD_PROVIDERS, TOKEN_ICONS } from "@/lib/constants";
import { Eye, Gift, ArrowRight } from "lucide-react";
import BalanceHeader from "@/components/BalanceHeader";

export default function AdsPage() {
  const { watchAd, addMint } = useUserStore();
  const [watchedAds, setWatchedAds] = useState<Set<string>>(new Set());
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "success" | "error">("idle");

  const handleWatchAd = (providerId: string, reward: number) => {
    // Simulate ad watching
    setTimeout(() => {
      watchAd(reward);
      setWatchedAds((prev) => new Set(prev).add(providerId));
    }, 500);
  };

  const handlePromo = () => {
    if (promoCode.length === 10) {
      addMint(25);
      setPromoStatus("success");
      setPromoCode("");
      setTimeout(() => setPromoStatus("idle"), 3000);
    } else {
      setPromoStatus("error");
      setTimeout(() => setPromoStatus("idle"), 3000);
    }
  };

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Ads & <span className="text-mint">Earn</span>
        </h1>
      </div>

      <BalanceHeader />

      <p className="text-xs text-muted-foreground text-center mt-1 mb-6 animate-fade-up">
        Watch ads to earn $MINT and refill energy
      </p>

      {/* Ad providers */}
      <div className="space-y-3 max-w-sm mx-auto w-full">
        {AD_PROVIDERS.map((provider, i) => (
          <div
            key={provider.id}
            className="surface-card rounded-xl p-4 flex items-center justify-between animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="w-5 h-5 text-mint" />
              </div>
              <div>
                <p className="font-semibold text-sm">{provider.name}</p>
                <p className="text-xs text-muted-foreground">Watch ad</p>
              </div>
            </div>
            <button
              onClick={() => handleWatchAd(provider.id, provider.reward)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-xs transition-all duration-200 active:scale-95"
            >
              <span>+{provider.reward}</span>
              <img src={TOKEN_ICONS.MINT} alt="" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Promo code section */}
      <div
        className="surface-card rounded-xl p-4 mt-6 max-w-sm mx-auto w-full animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-mint" />
          <span className="font-semibold text-sm">Lucky Code</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter 10-digit code"
            maxLength={10}
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
          />
          <button
            onClick={handlePromo}
            className="px-4 py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-95"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {promoStatus === "success" && (
          <p className="text-xs text-mint mt-2">+25 $MINT claimed!</p>
        )}
        {promoStatus === "error" && (
          <p className="text-xs text-destructive mt-2">Invalid code</p>
        )}
      </div>
    </div>
  );
}
