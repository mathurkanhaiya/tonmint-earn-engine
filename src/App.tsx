import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

import HomePage from "./pages/HomePage";
import AdsPage from "./pages/AdsPage";
import TasksPage from "./pages/TasksPage";
import ReferralPage from "./pages/ReferralPage";
import WalletPage from "./pages/WalletPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/* =========================
   ROUTES WITH AUTH CONTROL
========================= */
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // 🔄 Loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading TonMint...</p>
        </div>
      </div>
    );
  }

  // ❗ If not authenticated → not inside Telegram
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-4 bg-background">
        <p className="text-sm text-muted-foreground">
          Please open this app inside Telegram
        </p>
      </div>
    );
  }

  // ✅ Main app
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ads" element={<AdsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNav />
    </>
  );
}

/* =========================
   MAIN APP ENTRY
========================= */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* ✅ HashRouter works best inside Telegram */}
        <HashRouter>
          <AuthProvider>
            <div className="dark min-h-screen bg-background text-foreground">
              <AppRoutes />
            </div>
          </AuthProvider>
        </HashRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
}