import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Eye, ListChecks, Users, Wallet, Shield } from "lucide-react";

const baseTabs = [
  { path: "/", label: "Earn", icon: Zap },
  { path: "/ads", label: "Ads", icon: Eye },
  { path: "/tasks", label: "Tasks", icon: ListChecks },
  { path: "/referral", label: "Invite", icon: Users },
  { path: "/wallet", label: "Wallet", icon: Wallet },
];

const adminTab = { path: "/admin", label: "Admin", icon: Shield };

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs;

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
                  ? tab.path === "/admin" ? "text-yellow-400" : "text-mint"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className={`absolute bottom-0 w-8 h-0.5 rounded-full ${tab.path === "/admin" ? "bg-yellow-400" : "bg-mint"}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
