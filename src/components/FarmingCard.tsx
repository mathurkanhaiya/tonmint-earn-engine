import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { FARMING_CYCLE_MS, FARMING_REWARD } from "@/lib/constants";
import { Sprout, Check } from "lucide-react";

export default function FarmingCard() {
  const { farmingStartedAt, startFarming, claimFarming } = useUserStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = farmingStartedAt ? now - farmingStartedAt : 0;
  const progress = farmingStartedAt
    ? Math.min((elapsed / FARMING_CYCLE_MS) * 100, 100)
    : 0;
  const isComplete = elapsed >= FARMING_CYCLE_MS && farmingStartedAt !== null;
  const isFarming = farmingStartedAt !== null && !isComplete;

  const remaining = FARMING_CYCLE_MS - elapsed;
  const hours = Math.max(0, Math.floor(remaining / 3600000));
  const minutes = Math.max(0, Math.floor((remaining % 3600000) / 60000));
  const seconds = Math.max(0, Math.floor((remaining % 60000) / 1000));

  return (
    <div className="surface-card rounded-xl p-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-mint" />
          <span className="font-semibold text-sm">$MINT Farming</span>
        </div>
        <span className="font-mono text-xs text-mint font-medium">
          +{FARMING_REWARD} $MINT
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: isComplete
              ? "hsl(156 100% 50%)"
              : "linear-gradient(90deg, hsl(156 100% 40%), hsl(156 100% 50%))",
          }}
        />
      </div>

      {!farmingStartedAt && (
        <button
          onClick={startFarming}
          className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97] hover:brightness-110"
        >
          Start Farming
        </button>
      )}

      {isFarming && (
        <div className="text-center">
          <span className="font-mono text-lg text-foreground font-medium">
            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Farming in progress...
          </p>
        </div>
      )}

      {isComplete && (
        <button
          onClick={claimFarming}
          className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] glow-mint"
        >
          <Check className="w-4 h-4" />
          Claim {FARMING_REWARD} $MINT
        </button>
      )}
    </div>
  );
}
