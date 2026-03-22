import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { AD_PROVIDERS, TOKEN_ICONS } from "@/lib/constants";
import { syncWatchAd, syncBoostFromAd, redeemPromoCode } from "@/lib/supabaseSync";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Gift, ArrowRight, Zap, Plus, Loader2 } from "lucide-react";
import BalanceHeader from "@/components/BalanceHeader";

export default function AdsPage() {
  const {
    watchAd, addMint, mintBalance, energy, maxEnergy, totalAdsWatched,
    boostCount, boostLastRefillAt, addBoosts,
  } = useUserStore();
  const { user, profile } = useAuth();
  const [watchedAds, setWatchedAds] = useState<Set<string>>(new Set());
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [promoMessage, setPromoMessage] = useState("");
  const [boostAdLoading, setBoostAdLoading] = useState<string | null>(null);

  // Boost cooldown calculation
  const now = Date.now();
  const refillMs = 60 * 60 * 1000;
  let msUntilRefill = 0;
  if (boostLastRefillAt !== null && boostCount <= 0) {
    msUntilRefill = Math.max(0, refillMs - (now - boostLastRefillAt));
  }
  const hoursLeft = Math.floor(msUntilRefill / 3600000);
  const minutesLeft = Math.floor((msUntilRefill % 3600000) / 60000);

  const handleWatchAd = (providerId: string, reward: number) => {
    if (watchedAds.has(providerId)) return;
    setTimeout(() => {
      watchAd(reward);
      setWatchedAds(prev => new Set(prev).add(providerId));
      if (user?.id) {
        syncWatchAd(
          user.id, providerId, reward,
          mintBalance + reward,
          Math.min(energy + 5, maxEnergy),
          totalAdsWatched + 1
        );
        supabase.from('user_activity').insert({
          user_id: user.id,
          action_type: 'watch_ad',
          details: { provider: providerId, reward },
        }).then(() => {});
      }
    }, 500);
  };

  const handleBoostAd = async (type: 'boost_percent' | 'boost_refill') => {
    if (boostAdLoading) return;
    setBoostAdLoading(type);
    setTimeout(async () => {
      try {
        if (type === 'boost_percent') {
          // Watch Ad to Boost +10% energy
          const bonus = Math.ceil(maxEnergy * 0.1);
          addBoosts(0);
          const state = useUserStore.getState();
          const newEnergy = Math.min(state.energy + bonus, maxEnergy);
          useUserStore.setState({ energy: newEnergy });
          if (user?.id) {
            await syncBoostFromAd(user.id, state.boostCount, state.mintBalance, newEnergy, state.totalAdsWatched + 1, 'boost_percent');
            await supabase.from('user_activity').insert({
              user_id: user.id,
              action_type: 'boost_ad_percent',
              details: { bonus_energy: bonus },
            });
          }
        } else {
          // Watch Ad to Get 5 Boosts
          addBoosts(5);
          const state = useUserStore.getState();
          if (user?.id) {
            await syncBoostFromAd(user.id, state.boostCount, state.mintBalance, state.energy, state.totalAdsWatched + 1, 'boost_refill');
            await supabase.from('user_activity').insert({
              user_id: user.id,
              action_type: 'boost_ad_refill',
              details: { boosts_added: 5 },
            });
          }
        }
      } finally {
        setBoostAdLoading(null);
      }
    }, 800);
  };

  const handlePromo = async () => {
    if (!user?.id || !promoCode.trim()) return;
    setPromoStatus("loading");
    const result = await redeemPromoCode(user.id, promoCode.trim());
    if (result.success) {
      addMint(result.reward);
      setPromoMessage(`+${result.reward} $MINT claimed!`);
      setPromoStatus("success");
      setPromoCode("");
      if (user?.id) {
        await supabase.from('user_activity').insert({
          user_id: user.id,
          action_type: 'promo_code',
          details: { code: promoCode.trim(), reward: result.reward },
        });
      }
    } else {
      setPromoMessage(result.error || "Invalid code");
      setPromoStatus("error");
    }
    setTimeout(() => { setPromoStatus("idle"); setPromoMessage(""); }, 3000);
  };

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Ads & <span className="text-mint">Earn</span>
        </h1>
      </div>

      <BalanceHeader />

      <p className="text-xs text-muted-foreground text-center mt-1 mb-4 animate-fade-up">
        Watch ads to earn $MINT and refill energy
      </p>

      {/* Boost Section */}
      <div className="surface-card rounded-xl p-4 mb-4 max-w-sm mx-auto w-full animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Boost System</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-yellow-400">{boostCount}</span>
            <span className="text-xs text-muted-foreground"> boosts</span>
          </div>
        </div>

        {boostCount <= 0 && msUntilRefill > 0 && (
          <p className="text-[11px] text-muted-foreground mb-2">
            Next refill in: <span className="text-yellow-400 font-mono">{hoursLeft}h {minutesLeft}m</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleBoostAd('boost_percent')}
            disabled={boostAdLoading !== null}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            {boostAdLoading === 'boost_percent' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Watch Ad to Boost +10%
          </button>
          <button
            onClick={() => handleBoostAd('boost_refill')}
            disabled={boostAdLoading !== null}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            {boostAdLoading === 'boost_refill' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Watch Ad to Get 5 Boosts
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          10 boosts refill automatically every hour • 50 boosts = 5 hours
        </p>
      </div>

      {/* Ad Providers */}
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
                <p className="text-xs text-muted-foreground">Watch ad • +5 energy</p>
              </div>
            </div>
            <button
              onClick={() => handleWatchAd(provider.id, provider.reward)}
              disabled={watchedAds.has(provider.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>+{provider.reward}</span>
              <img src={TOKEN_ICONS.MINT} alt="" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Promo Code */}
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
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            maxLength={20}
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
            onKeyDown={(e) => e.key === 'Enter' && handlePromo()}
          />
          <button
            onClick={handlePromo}
            disabled={promoStatus === 'loading' || !promoCode.trim()}
            className="px-4 py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
          >
            {promoStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
        {promoStatus === "success" && (
          <p className="text-xs text-mint mt-2 font-medium">{promoMessage}</p>
        )}
        {promoStatus === "error" && (
          <p className="text-xs text-destructive mt-2">{promoMessage}</p>
        )}
      </div>
    </div>
  );
}
