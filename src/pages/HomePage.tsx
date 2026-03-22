import BalanceHeader from "@/components/BalanceHeader";
import TapButton from "@/components/TapButton";
import FarmingCard from "@/components/FarmingCard";
import DailyDropCard from "@/components/DailyDropCard";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Ton<span className="text-mint">Mint</span>
        </h1>
      </div>

      <BalanceHeader />

      <div className="mt-6">
        <TapButton />
      </div>

      <div className="w-full mt-6 max-w-sm space-y-3">
        <DailyDropCard />
        <FarmingCard />
      </div>

      <p className="text-[11px] text-muted-foreground mt-6 text-center animate-fade-up" style={{ animationDelay: "300ms" }}>
        Every tap = $MINT earned. Keep grinding.
      </p>
    </div>
  );
}
