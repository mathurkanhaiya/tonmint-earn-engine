import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { TOKEN_ICONS, WITHDRAWAL_MIN_TON, WITHDRAWAL_FEE_PERCENT } from "@/lib/constants";
import { ArrowRightLeft, ArrowUpRight, User, Shield } from "lucide-react";

export default function WalletPage() {
  const { mintBalance, usdtBalance, tonBalance } = useUserStore();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const balances = [
    { name: "$MINT", amount: mintBalance, icon: TOKEN_ICONS.MINT },
    { name: "USDT", amount: usdtBalance, icon: TOKEN_ICONS.USDT },
    { name: "TON", amount: tonBalance, icon: TOKEN_ICONS.TON },
  ];

  // Mock conversion rates
  const mintToTon = mintBalance * 0.0001;

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-mint">Wallet</span>
        </h1>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 surface-card rounded-xl p-4 max-w-sm mx-auto w-full mb-4 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <User className="w-6 h-6 text-mint" />
        </div>
        <div>
          <p className="font-semibold text-sm">@tonmint_user</p>
          <p className="text-xs text-muted-foreground font-mono">ID: 2139807311</p>
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
              className="w-full py-2.5 rounded-lg bg-mint text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.97]"
            >
              Submit Withdrawal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
