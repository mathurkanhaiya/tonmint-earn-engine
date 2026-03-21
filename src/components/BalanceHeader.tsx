import { TOKEN_ICONS } from "@/lib/constants";
import { useUserStore } from "@/lib/store";

export default function BalanceHeader() {
  const mintBalance = useUserStore((s) => s.mintBalance);
  const isInitialized = useUserStore((s) => s.isInitialized);

  return (
    <div className="flex items-center justify-center gap-2 pt-4 pb-2 animate-fade-up">
      <img src={TOKEN_ICONS.MINT} alt="MINT" className="w-7 h-7" />
      {isInitialized ? (
        <span className="font-mono text-3xl font-bold text-mint tracking-tight">
          {mintBalance.toLocaleString()}
        </span>
      ) : (
        <span className="w-28 h-9 rounded-lg bg-muted animate-pulse inline-block" />
      )}
      <span className="text-sm text-muted-foreground font-medium">$MINT</span>
    </div>
  );
}
