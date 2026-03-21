import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { TOKEN_ICONS, WITHDRAWAL_MIN_TON, WITHDRAWAL_FEE_PERCENT } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRightLeft, ArrowUpRight, User, Shield } from "lucide-react";

export default function WalletPage() {
  const { mintBalance, usdtBalance, tonBalance } = useUserStore();
  const { user, profile, telegramUser } = useAuth();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "success" | "error">("idle");

  const displayName = profile?.display_name || telegramUser?.display_name || "User";
  const username = profile?.telegram_username || telegramUser?.username || "";
  const photoUrl = profile?.telegram_photo_url || telegramUser?.photo_url || "";
  const telegramId = profile?.telegram_id || telegramUser?.id || null;

  const balances = [
    { name: "$MINT", amount: mintBalance, icon: TOKEN_ICONS.MINT },
    { name: "USDT", amount: usdtBalance, icon: TOKEN_ICONS.USDT },
    { name: "TON", amount: tonBalance, icon: TOKEN_ICONS.TON },
  ];

  const mintToTon = mintBalance * 0.0001;

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!walletAddress || isNaN(amount) || amount < WITHDRAWAL_MIN_TON || !user?.id) return;
    setSubmitting(true);
    try {
      const fee = (amount * WITHDRAWAL_FEE_PERCENT) / 100;
      const net = amount - fee;
      const { error } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount_ton: amount,
        fee_ton: fee,
        net_ton: net,
        wallet_address: walletAddress,
      });
      if (error) throw error;
      setWithdrawStatus("success");
      setWithdrawAmount("");
      setWalletAddress("");
      setShowWithdraw(false);
      setTimeout(() => setWithdrawStatus("idle"), 4000);
    } catch {
      setWithdrawStatus("error");
      setTimeout(() => setWithdrawStatus("idle"), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-mint">Wallet</span>
        </h1>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 surface-card rounded-xl p-4 max-w-sm mx-auto w-full mb-4 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-mint" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{username ? `@${username}` : displayName}</p>
          {telegramId && (
            <p className="text-xs text-muted-foreground font-mono">ID: {telegramId}</p>
          )}
        </div>
        <div className="ml-auto">
          <Shield className="w-4 h-4 text-mint" />
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-2 max-w-sm mx-auto w-full">
        {balances.map((bal, i) => (
          <div
            key={bal.name}
            className="surface-card rounded-xl p-4 flex items-center justify-between animate-fade-up"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <img src={bal.icon} alt={bal.name} className="w-8 h-8" />
              <span className="font-semibold text-sm">{bal.name}</span>
            </div>
            <span className="font-mono text-lg font-bold">
              {bal.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </div>
        ))}
      </div>

      {/* Conversion info */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <ArrowRightLeft className="w-4 h-4 text-mint" />
          <span className="font-semibold text-sm">Conversion</span>
        </div>
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted">
          <span className="text-xs text-muted-foreground">
            {mintBalance.toLocaleString()} $MINT
          </span>
          <span className="text-xs text-mint">→</span>
          <span className="font-mono text-sm font-medium">
            {mintToTon.toFixed(4)} TON
          </span>
        </div>
      </div>

      {withdrawStatus === "success" && (
        <div className="surface-card rounded-xl p-3 mt-4 max-w-sm mx-auto w-full text-center">
          <p className="text-xs text-mint font-medium">Withdrawal submitted! Awaiting admin approval.</p>
        </div>
      )}
      {withdrawStatus === "error" && (
        <div className="surface-card rounded-xl p-3 mt-4 max-w-sm mx-auto w-full text-center">
          <p className="text-xs text-destructive font-medium">Failed to submit withdrawal. Try again.</p>
        </div>
      )}

      {/* Withdraw */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-4 h-4 text-mint" />
          <span className="font-semibold text-sm">Withdraw TON</span>
        </div>

        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97]"
          >
            Withdraw
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="TON wallet address"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
            />
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Min ${WITHDRAWAL_MIN_TON} TON`}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
            />
            <div className="text-[11px] text-muted-foreground">
              Fee: {WITHDRAWAL_FEE_PERCENT}% • Min: {WITHDRAWAL_MIN_TON} TON • Admin approval required
            </div>
            <button
              onClick={handleWithdraw}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Withdrawal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
