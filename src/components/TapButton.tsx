import { useState, useCallback, useRef } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { TOKEN_ICONS } from "@/lib/constants";
import { syncTap } from "@/lib/supabaseSync";

interface FloatingMint {
  id: number;
  x: number;
  y: number;
}

export default function TapButton() {
  const { energy, maxEnergy, tap, mintBalance, totalTaps } = useUserStore();
  const { user } = useAuth();
  const [isPressed, setIsPressed] = useState(false);
  const [floats, setFloats] = useState<FloatingMint[]>([]);
  const nextId = useRef(0);

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (energy <= 0) return;

      tap();

      if (user?.id) {
        syncTap(user.id, mintBalance + 1, energy - 1, totalTaps + 1);
      }

      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const id = nextId.current++;

      setFloats((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
      }, 800);
    },
    [energy, tap, mintBalance, totalTaps, user]
  );

  const energyPercent = (energy / maxEnergy) * 100;

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="relative">
        {isPressed && (
          <div className="absolute inset-0 rounded-full border-2 border-mint animate-pulse-ring" />
        )}

        <button
          onMouseDown={handleTap}
          onTouchStart={handleTap}
          disabled={energy <= 0}
          className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-transform duration-150 ${
            isPressed ? "scale-95" : "scale-100"
          } ${
            energy > 0
              ? "glow-mint cursor-pointer active:scale-95"
              : "opacity-40 cursor-not-allowed"
          }`}
          style={{
            background: `radial-gradient(circle, hsl(156 100% 50% / 0.15) 0%, hsl(156 100% 50% / 0.05) 60%, transparent 100%)`,
            border: "2px solid hsl(156 100% 50% / 0.3)",
          }}
        >
          <img
            src={TOKEN_ICONS.MINT}
            alt="Tap to earn MINT"
            className={`w-20 h-20 transition-transform duration-150 ${
              isPressed ? "scale-110" : ""
            }`}
          />
        </button>

        {floats.map((f) => (
          <div
            key={f.id}
            className="absolute pointer-events-none animate-mint-float font-mono font-bold text-mint text-lg"
            style={{ left: f.x - 10, top: f.y - 20 }}
          >
            +1
          </div>
        ))}
      </div>

      <div className="w-48 flex flex-col items-center gap-1.5">
        <div className="flex items-center justify-between w-full text-xs">
          <span className="text-muted-foreground">Energy</span>
          <span className="font-mono text-mint font-medium">
            {energy}/{maxEnergy}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${energyPercent}%`,
              background: `linear-gradient(90deg, hsl(156 100% 40%), hsl(156 100% 50%))`,
            }}
          />
        </div>
        {energy === 0 && (
          <p className="text-[11px] text-destructive font-medium">
            Watch ads to refill energy
          </p>
        )}
      </div>
    </div>
  );
}
