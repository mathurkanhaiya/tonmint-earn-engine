import { useLocation, useNavigate } from "react-router-dom";
import { Zap, Eye, ListChecks, Users, Wallet } from "lucide-react";

const tabs = [
  { path: "/", label: "Earn", icon: Zap },
  { path: "/ads", label: "Ads", icon: Eye },
  { path: "/tasks", label: "Tasks", icon: ListChecks },
  { path: "/referral", label: "Invite", icon: Users },
  { path: "/wallet", label: "Wallet", icon: Wallet },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-mint"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-mint rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
