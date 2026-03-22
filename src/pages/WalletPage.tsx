import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/lib/appSettings";
import { syncSwap } from "@/lib/supabaseSync";
import { TOKEN_ICONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRightLeft, ArrowUpRight, User, Shield, RefreshCw,
  Copy, Check, ChevronDown, ChevronUp, Loader2
} from "lucide-react";

export default function WalletPage() {
  const { mintBalance, usdtBalance, tonBalance, isInitialized, swapMintToTon, swapUsdtToTon } = useUserStore();
  const { user, profile, telegramUser } = useAuth();
  const { settings } = useAppSettings();

  const MINT_PER_TON = settings.mint_ton_rate;
  const USDT_PER_TON = settings.usdt_ton_rate;
  const WITHDRAWAL_MIN_TON = settings.min_withdrawal_ton;
  const WITHDRAWAL_FEE_PERCENT = settings.withdrawal_fee_percent;

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "success" | "error">("idle");
  const [withdrawError, setWithdrawError] = useState("");

  const [swapFrom, setSwapFrom] = useState<"MINT" | "USDT">("MINT");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<"idle" | "success" | "error">("idle");

  const [addressCopied, setAddressCopied] = useState(false);

  const displayName = profile?.display_name || telegramUser?.display_name || "User";
  const username = profile?.telegram_username || telegramUser?.username || "";
  const photoUrl = profile?.telegram_photo_url || telegramUser?.photo_url || "";
  const telegramId = profile?.telegram_id || telegramUser?.id || null;

  const balances = [
    { name: "$MINT", amount: mintBalance, icon: TOKEN_ICONS.MINT },
    { name: "USDT", amount: usdtBalance, icon: TOKEN_ICONS.USDT },
    { name: "TON", amount: tonBalance, icon: TOKEN_ICONS.TON },
  ];

  const swapAmountNum = parseFloat(swapAmount) || 0;
  const swapPreviewTon =
    swapFrom === "MINT" ? swapAmountNum / MINT_PER_TON : swapAmountNum / USDT_PER_TON;
  const swapBalance = swapFrom === "MINT" ? mintBalance : usdtBalance;
  const swapInsufficient = swapAmountNum > 0 && swapAmountNum > swapBalance;
  const swapMin = swapFrom === "MINT" ? MINT_PER_TON : 1;
  const swapBelowMin = swapAmountNum > 0 && swapAmountNum < swapMin;

  const handleSwap = async () => {
    if (!user?.id || swapAmountNum <= 0 || swapInsufficient || swapBelowMin) return;
    setSwapping(true);
    try {
      const state = useUserStore.getState();
      let newMint = state.mintBalance;
      let newUsdt = state.usdtBalance;
      const newTon = state.tonBalance + swapPreviewTon;

      if (swapFrom === "MINT") {
        newMint = state.mintBalance - swapAmountNum;
        swapMintToTon(swapAmountNum, swapPreviewTon);
      } else {
        newUsdt = state.usdtBalance - swapAmountNum;
        swapUsdtToTon(swapAmountNum, swapPreviewTon);
      }

      await syncSwap(user.id, swapFrom, swapAmountNum, swapPreviewTon, newMint, newUsdt, newTon);
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action_type: 'swap',
        details: { from: swapFrom, amount: swapAmountNum, to_ton: swapPreviewTon },
      });
      setSwapStatus("success");
      setSwapAmount("");
      setTimeout(() => setSwapStatus("idle"), 4000);
    } catch {
      setSwapStatus("error");
      setTimeout(() => setSwapStatus("idle"), 3000);
    } finally {
      setSwapping(false);
    }
  };

  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const belowMin = withdrawAmountNum > 0 && withdrawAmountNum < WITHDRAWAL_MIN_TON;
  const aboveTon = withdrawAmountNum > tonBalance;
  const feeAmount = (withdrawAmountNum * WITHDRAWAL_FEE_PERCENT) / 100;
  const netAmount = withdrawAmountNum - feeAmount;

  const handleWithdraw = async () => {
    setWithdrawError("");
    if (!walletAddress.trim()) {
      setWithdrawError("Please enter a TON wallet address.");
      return;
    }
    if (isNaN(withdrawAmountNum) || withdrawAmountNum <= 0) {
      setWithdrawError("Please enter a valid amount.");
      return;
    }
    if (belowMin) {
      setWithdrawError(`Minimum withdrawal is ${WITHDRAWAL_MIN_TON} TON.`);
      return;
    }
    if (aboveTon) {
      setWithdrawError("Insufficient TON balance.");
      return;
    }
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        amount_ton: withdrawAmountNum,
        fee_ton: feeAmount,
        net_ton: netAmount,
        wallet_address: walletAddress.trim(),
      });
      if (error) throw error;
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action_type: 'withdrawal_request',
        details: { amount_ton: withdrawAmountNum, net_ton: netAmount, wallet: walletAddress.trim() },
      });
      setWithdrawStatus("success");
      setWithdrawAmount("");
      setWalletAddress("");
      setShowWithdraw(false);
      setTimeout(() => setWithdrawStatus("idle"), 5000);
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

      {/* Profile card */}
      <div className="flex items-center gap-3 surface-card rounded-xl p-4 max-w-sm mx-auto w-full mb-4 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-mint" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{username ? `@${username}` : displayName}</p>
          {telegramId && (
            <p className="text-xs text-muted-foreground font-mono">ID: {telegramId}</p>
          )}
        </div>
        <Shield className="w-4 h-4 text-mint flex-shrink-0" />
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
            {isInitialized ? (
              <span className="font-mono text-lg font-bold">
                {bal.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            ) : (
              <span className="w-20 h-6 rounded bg-muted animate-pulse inline-block" />
            )}
          </div>
        ))}
      </div>

      {/* Swap Section */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "320ms" }}>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft className="w-4 h-4 text-mint" />
          <span className="font-semibold text-sm">Swap to TON</span>
        </div>

        <div className="flex gap-2 mb-3">
          {(["MINT", "USDT"] as const).map((tok) => (
            <button
              key={tok}
              onClick={() => { setSwapFrom(tok); setSwapAmount(""); setSwapStatus("idle"); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                swapFrom === tok ? "bg-mint text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {tok === "MINT" ? "$MINT" : "USDT"} → TON
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mb-2">
          Rate: {swapFrom === "MINT" ? `${MINT_PER_TON.toLocaleString()} $MINT = 1 TON` : `${USDT_PER_TON} USDT = 1 TON`}
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="number"
            value={swapAmount}
            onChange={(e) => { setSwapAmount(e.target.value); setSwapStatus("idle"); }}
            placeholder={`Min ${swapFrom === "MINT" ? MINT_PER_TON.toLocaleString() : "1"} ${swapFrom === "MINT" ? "$MINT" : "USDT"}`}
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
          />
          <button
            onClick={() => setSwapAmount(String(swapBalance))}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium text-mint hover:bg-mint/10 transition-colors"
          >
            MAX
          </button>
        </div>

        {swapAmountNum > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted mb-2">
            <span className="text-xs text-muted-foreground">
              {swapAmountNum.toLocaleString()} {swapFrom === "MINT" ? "$MINT" : "USDT"}
            </span>
            <span className="text-xs text-mint">→</span>
            <span className="font-mono text-sm font-bold text-mint">{swapPreviewTon.toFixed(4)} TON</span>
          </div>
        )}

        {swapInsufficient && <p className="text-[11px] text-destructive mb-2">Insufficient balance.</p>}
        {swapBelowMin && !swapInsufficient && (
          <p className="text-[11px] text-destructive mb-2">
            Minimum swap: {swapFrom === "MINT" ? `${MINT_PER_TON.toLocaleString()} $MINT` : "1 USDT"}.
          </p>
        )}
        {swapStatus === "success" && <p className="text-[11px] text-mint mb-2 font-medium">Swap successful! TON added to your balance.</p>}
        {swapStatus === "error" && <p className="text-[11px] text-destructive mb-2">Swap failed. Please try again.</p>}

        <button
          onClick={handleSwap}
          disabled={swapping || swapAmountNum <= 0 || swapInsufficient || swapBelowMin || !isInitialized}
          className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {swapping ? <><RefreshCw className="w-4 h-4 animate-spin" /> Swapping...</> : "Swap"}
        </button>
      </div>

      {/* Withdraw Section */}
      <div className="surface-card rounded-xl p-4 mt-4 max-w-sm mx-auto w-full animate-fade-up" style={{ animationDelay: "400ms" }}>
        <button
          onClick={() => { setShowWithdraw(!showWithdraw); setWithdrawError(""); }}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-mint" />
            <span className="font-semibold text-sm">Withdraw TON</span>
          </div>
          {showWithdraw ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showWithdraw && (
          <div className="mt-4 space-y-3">
            {/* Info strip */}
            <div className="flex gap-2 text-[11px] text-muted-foreground">
              <span className="flex-1 text-center py-1.5 rounded-lg bg-muted">Fee: <span className="text-foreground font-medium">{WITHDRAWAL_FEE_PERCENT}%</span></span>
              <span className="flex-1 text-center py-1.5 rounded-lg bg-muted">Min: <span className="text-foreground font-medium">{WITHDRAWAL_MIN_TON} TON</span></span>
              <span className="flex-1 text-center py-1.5 rounded-lg bg-muted">Admin approval required</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => { setWalletAddress(e.target.value); setWithdrawError(""); }}
                placeholder="TON wallet address"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-muted border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint"
              />
              {walletAddress && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    setAddressCopied(true);
                    setTimeout(() => setAddressCopied(false), 2000);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-mint"
                >
                  {addressCopied ? <Check className="w-3.5 h-3.5 text-mint" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(""); }}
              placeholder={`Min ${WITHDRAWAL_MIN_TON} TON`}
              className={`w-full px-3 py-2 rounded-lg bg-muted border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint ${
                belowMin || aboveTon ? "border-destructive" : "border-border"
              }`}
            />

            {belowMin && <p className="text-[11px] text-destructive -mt-1">Minimum withdrawal is {WITHDRAWAL_MIN_TON} TON.</p>}
            {aboveTon && !belowMin && <p className="text-[11px] text-destructive -mt-1">Exceeds your TON balance ({tonBalance.toFixed(4)} TON).</p>}
            {withdrawError && !belowMin && !aboveTon && <p className="text-[11px] text-destructive -mt-1">{withdrawError}</p>}

            {withdrawAmountNum >= WITHDRAWAL_MIN_TON && !aboveTon && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="font-mono text-sm">{withdrawAmountNum.toFixed(4)} TON</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">Fee ({WITHDRAWAL_FEE_PERCENT}%)</span>
                  <span className="font-mono text-sm text-destructive">-{feeAmount.toFixed(4)} TON</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-mint/5">
                  <span className="text-xs font-semibold">You receive</span>
                  <span className="font-mono text-sm font-bold text-mint">{netAmount.toFixed(4)} TON</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowWithdraw(false); setWithdrawError(""); setWithdrawAmount(""); setWalletAddress(""); }}
                className="flex-1 py-2.5 rounded-lg bg-muted text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={submitting || belowMin || aboveTon || !walletAddress.trim() || withdrawAmountNum <= 0}
                className="flex-1 py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status banners */}
      {withdrawStatus === "success" && (
        <div className="surface-card rounded-xl p-3 mt-4 max-w-sm mx-auto w-full text-center border border-mint/20">
          <p className="text-xs text-mint font-medium">✅ Withdrawal submitted! Awaiting admin approval.</p>
        </div>
      )}
      {withdrawStatus === "error" && (
        <div className="surface-card rounded-xl p-3 mt-4 max-w-sm mx-auto w-full text-center border border-destructive/20">
          <p className="text-xs text-destructive font-medium">Failed to submit withdrawal. Try again.</p>
        </div>
      )}
    </div>
  );
}
