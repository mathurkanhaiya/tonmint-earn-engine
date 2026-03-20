import { TOKEN_ICONS } from "@/lib/constants";
import { useUserStore } from "@/lib/store";

export default function BalanceHeader() {
  const mintBalance = useUserStore((s) => s.mintBalance);

  return (
    <div className="flex items-center justify-center gap-2 pt-4 pb-2 animate-fade-up">
      <img src={TOKEN_ICONS.MINT} alt="MINT" className="w-7 h-7" />
      <span className="font-mono text-3xl font-bold text-mint tracking-tight">
        {mintBalance.toLocaleString()}
      </span>
      <span className="text-sm text-muted-foreground font-medium">$MINT</span>
    </div>
  );
}
