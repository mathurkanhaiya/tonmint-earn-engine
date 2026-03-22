import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { DAILY_DROP_REWARDS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Flame, CheckCircle, Lock } from "lucide-react";

function isSameDay(ts: number | null) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function DailyDropCard() {
  const { user, session, profile } = useAuth();
  const { dailyDropStreak, dailyDropClaimedAt, claimDailyDrop, isInitialized } = useUserStore();
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  const alreadyClaimed = isSameDay(dailyDropClaimedAt);
  const currentDay = Math.max(1, Math.min(dailyDropStreak || 1, 7));
  const displayDay = alreadyClaimed ? currentDay : (dailyDropStreak >= 7 ? 1 : dailyDropStreak + 1 || 1);
  const todayReward = DAILY_DROP_REWARDS[(displayDay - 1) % 7];

  const handleClaim = async () => {
    if (!user?.id || !session?.access_token || alreadyClaimed || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/daily-drop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, accessToken: session.access_token }),
      });
      const data = await res.json();
      if (data.success) {
        claimDailyDrop(data.streakDay, data.rewardMint);
        setJustClaimed(true);
        setTimeout(() => setJustClaimed(false), 3000);
      }
    } catch (e) {
      console.error('Daily drop claim failed:', e);
    } finally {
      setClaiming(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="surface-card rounded-xl p-4 animate-fade-up w-full">
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="surface-card rounded-xl p-4 animate-fade-up w-full" style={{ animationDelay: "150ms" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-mint" />
          <span className="font-semibold text-sm">Daily Drop</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-orange-400 font-medium">
          <Flame className="w-3.5 h-3.5" />
          <span>{alreadyClaimed ? currentDay : (dailyDropStreak || 0)}/7 streak</span>
        </div>
      </div>

      {/* Day progress */}
      <div className="flex gap-1 mb-3">
        {DAILY_DROP_REWARDS.map((reward, i) => {
          const dayNum = i + 1;
          const isDone = alreadyClaimed ? dayNum <= currentDay : dayNum < displayDay;
          const isToday = dayNum === displayDay && !alreadyClaimed;
          const isClaimed = alreadyClaimed && dayNum === currentDay;

          return (
            <div
              key={dayNum}
              className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-center transition-all ${
                isClaimed
                  ? 'bg-mint/20 border border-mint/40'
                  : isToday
                  ? 'bg-mint/10 border border-mint/30'
                  : isDone
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-muted border border-transparent'
              }`}
            >
              {isClaimed ? (
                <CheckCircle className="w-3 h-3 text-mint mb-0.5" />
              ) : isDone ? (
                <CheckCircle className="w-3 h-3 text-green-400 mb-0.5" />
              ) : isToday ? (
                <span className="text-[9px] font-bold text-mint mb-0.5">TODAY</span>
              ) : (
                <Lock className="w-3 h-3 text-muted-foreground mb-0.5" />
              )}
              <span className={`font-mono text-[9px] font-bold ${isToday ? 'text-mint' : isDone || isClaimed ? 'text-green-400' : 'text-muted-foreground'}`}>
                +{reward}
              </span>
            </div>
          );
        })}
      </div>

      {justClaimed ? (
        <div className="w-full py-2 rounded-lg bg-mint/10 border border-mint/20 text-center">
          <p className="text-sm font-semibold text-mint">+{todayReward} $MINT claimed! 🎉</p>
        </div>
      ) : alreadyClaimed ? (
        <div className="w-full py-2 rounded-lg bg-muted text-center">
          <p className="text-xs text-muted-foreground">Come back tomorrow for <span className="text-mint font-mono font-bold">+{DAILY_DROP_REWARDS[(currentDay % 7)]}</span> $MINT</p>
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] glow-mint disabled:opacity-60"
        >
          {claiming ? (
            <span className="animate-pulse">Claiming...</span>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Claim Day {displayDay} — +{todayReward} $MINT
            </>
          )}
        </button>
      )}
    </div>
  );
}
