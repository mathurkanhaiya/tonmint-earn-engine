import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { REFERRAL_LEVELS, TOKEN_ICONS } from "@/lib/constants";
import { Copy, Check, Users, TrendingUp } from "lucide-react";
import BalanceHeader from "@/components/BalanceHeader";

export default function ReferralPage() {
  const { referralCount, isInitialized } = useUserStore();
  const { profile, telegramUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const telegramId = profile?.telegram_id || telegramUser?.id || null;
  const botUsername = "OpenTonMintbot";
  const referralLink = telegramId
    ? `https://t.me/${botUsername}/app?startapp=${telegramId}`
    : `https://t.me/${botUsername}/app`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actualReferralCount = profile?.referral_count ?? referralCount;

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Invite & <span className="text-mint">Earn</span>
        </h1>
      </div>

      <BalanceHeader />

      <p className="text-xs text-muted-foreground text-center mt-1 mb-6 animate-fade-up">
        Build a network → multiply your $MINT earnings
      </p>

      {/* Referral link */}
      <div className="surface-card rounded-xl p-4 max-w-sm mx-auto w-full animate-fade-up">
        <p className="text-xs text-muted-foreground mb-2">Your referral link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono text-foreground/70 truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-lg bg-mint text-primary-foreground transition-all duration-200 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-mint mt-2 font-medium">
          Earn $0.02 USDT per valid referral
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="surface-card rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-mint mx-auto mb-1" />
          {isInitialized ? (
            <p className="font-mono text-2xl font-bold">{actualReferralCount}</p>
          ) : (
            <div className="h-8 w-12 mx-auto rounded bg-muted animate-pulse my-0.5" />
          )}
          <p className="text-[11px] text-muted-foreground">Referrals</p>
        </div>
        <div className="surface-card rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-mint mx-auto mb-1" />
          {isInitialized ? (
            <p className="font-mono text-2xl font-bold">
              ${(actualReferralCount * 0.02).toFixed(2)}
            </p>
          ) : (
            <div className="h-8 w-16 mx-auto rounded bg-muted animate-pulse my-0.5" />
          )}
          <p className="text-[11px] text-muted-foreground">USDT Earned</p>
        </div>
      </div>

      {/* Commission levels */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "200ms" }}>
        <p className="font-semibold text-sm mb-3">Commission Levels</p>
        <div className="space-y-2">
          {REFERRAL_LEVELS.map((level) => (
            <div
              key={level.level}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted"
            >
              <span className="text-sm">Level {level.level}</span>
              <span className="font-mono text-sm text-mint font-medium">
                {level.commission}% in $MINT
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation rules */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "300ms" }}>
        <p className="font-semibold text-sm mb-2">Referral Validation</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Must watch ≥5 ads</li>
          <li>• Complete 1–2 tasks</li>
          <li>• No self-referrals</li>
          <li>• Unique device/IP required</li>
        </ul>
      </div>
    </div>
  );
}
