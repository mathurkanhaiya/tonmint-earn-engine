import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TOKEN_ICONS } from "@/lib/constants";
import {
  Users, Eye, Zap, DollarSign, Settings, ListChecks,
  ArrowUpRight, ArrowRightLeft, Gift, Shield, LogOut, ChevronDown, ChevronUp,
  Check, X, Loader2
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalAdsWatched: number;
  totalMintGenerated: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
}

export default function AdminPanel() {
  const { isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalAdsWatched: 0, totalMintGenerated: 0,
    totalWithdrawals: 0, pendingWithdrawals: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New task form
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'external' as 'telegram' | 'external', reward_mint: 0, url: '', telegram_channel: '' });
  // New promo form
  const [newPromo, setNewPromo] = useState({ reward_mint: 0, max_uses: 100 });

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(), loadUsers(), loadWithdrawals(), loadTasks(), loadPromoCodes(), loadSettings()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data: profiles } = await supabase.from('profiles').select('mint_balance, total_ads_watched');
    if (profiles) {
      setStats({
        totalUsers: profiles.length,
        totalAdsWatched: profiles.reduce((sum, p) => sum + p.total_ads_watched, 0),
        totalMintGenerated: profiles.reduce((sum, p) => sum + Number(p.mint_balance), 0),
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
      });
    }
    const { data: wds } = await supabase.from('withdrawals').select('status');
    if (wds) {
      setStats(prev => ({
        ...prev,
        totalWithdrawals: wds.length,
        pendingWithdrawals: wds.filter(w => w.status === 'pending').length,
      }));
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const loadWithdrawals = async () => {
    const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
    if (data) setWithdrawals(data);
  };

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  const loadPromoCodes = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (data) setPromoCodes(data);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (data) setSettings(data);
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('withdrawals').update({
      status,
      processed_at: new Date().toISOString(),
    }).eq('id', id);
    loadWithdrawals();
    loadStats();
  };

  const handleCreateTask = async () => {
    await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description,
      type: newTask.type,
      reward_mint: newTask.reward_mint,
      url: newTask.url || null,
      telegram_channel: newTask.telegram_channel || null,
    });
    setNewTask({ title: '', description: '', type: 'external', reward_mint: 0, url: '', telegram_channel: '' });
    loadTasks();
  };

  const handleToggleTask = async (id: string, isActive: boolean) => {
    await supabase.from('tasks').update({ is_active: !isActive }).eq('id', id);
    loadTasks();
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleCreatePromo = async () => {
    const code = generatePromoCode();
    await supabase.from('promo_codes').insert({
      code,
      reward_mint: newPromo.reward_mint,
      max_uses: newPromo.max_uses,
    });
    setNewPromo({ reward_mint: 0, max_uses: 100 });
    loadPromoCodes();
  };

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !isActive }).eq('id', id);
    loadPromoCodes();
  };

  const [swapSaveStatus, setSwapSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'ok' | 'err'>('idle');

  const handleApplyMigration = async () => {
    setMigrationStatus('running');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('apply-migration', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setMigrationStatus('ok');
      setTimeout(() => loadSettings(), 500);
    } catch (e: any) {
      console.error(e);
      setMigrationStatus('err');
    }
  };

  const handleSaveSwapRates = async () => {
    if (!settings) return;
    setSwapSaveStatus('saving');
    const { error } = await supabase.from('app_settings').update({
      mint_ton_rate: settings.mint_ton_rate,
      usdt_ton_rate: settings.usdt_ton_rate,
    }).eq('id', 1);
    setSwapSaveStatus(error ? 'err' : 'ok');
    setTimeout(() => setSwapSaveStatus('idle'), 3000);
    if (!error) loadSettings();
  };

  const handleSaveRewards = async () => {
    if (!settings) return;
    await supabase.from('app_settings').update({
      tap_reward_mint: settings.tap_reward_mint,
      ad_reward_mint: settings.ad_reward_mint,
      farming_reward_mint: settings.farming_reward_mint,
      farming_cycle_hours: settings.farming_cycle_hours,
      max_energy: settings.max_energy,
    }).eq('id', 1);
    loadSettings();
  };

  const handleSaveReferral = async () => {
    if (!settings) return;
    await supabase.from('app_settings').update({
      referral_usdt: settings.referral_usdt,
      referral_l1_percent: settings.referral_l1_percent,
      referral_l2_percent: settings.referral_l2_percent,
      referral_l3_percent: settings.referral_l3_percent,
      min_withdrawal_ton: settings.min_withdrawal_ton,
      withdrawal_fee_percent: settings.withdrawal_fee_percent,
    }).eq('id', 1);
    loadSettings();
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground">Admin privileges required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint" />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Zap },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'promos', label: 'Promos', icon: Gift },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 pb-4 text-center">
        <h1 className="text-xl font-bold">
          <Shield className="w-5 h-5 inline-block text-mint mr-1 mb-1" />
          Admin Panel
        </h1>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-mint text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
            <StatCard icon={Eye} label="Ads Watched" value={stats.totalAdsWatched} />
            <StatCard icon={Zap} label="$MINT Generated" value={Math.round(stats.totalMintGenerated)} color />
            <StatCard icon={ArrowUpRight} label="Pending Withdrawals" value={stats.pendingWithdrawals} />
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="surface-card rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{u.display_name || u.telegram_username || 'Anonymous'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">TG: {u.telegram_id || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-mint">{Number(u.mint_balance).toLocaleString()} $MINT</p>
                    <p className="text-[10px] text-muted-foreground">Taps: {u.total_taps} | Ads: {u.total_ads_watched}</p>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No users yet</p>}
          </div>
        )}

        {/* Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w.id} className="surface-card rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm font-semibold">{Number(w.amount_ton).toFixed(4)} TON</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{w.wallet_address}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>{w.status}</span>
                </div>
                {w.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleWithdrawalAction(w.id, 'approved')}
                      className="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => handleWithdrawalAction(w.id, 'rejected')}
                      className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform">
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {withdrawals.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No withdrawals</p>}
          </div>
        )}

        {/* Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Create task form */}
            <div className="surface-card rounded-xl p-4">
              <p className="font-semibold text-sm mb-3">Create Task</p>
              <div className="space-y-2">
                <input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))}
                  placeholder="Task title" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <input value={newTask.description} onChange={e => setNewTask(p => ({...p, description: e.target.value}))}
                  placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <div className="flex gap-2">
                  <select value={newTask.type} onChange={e => setNewTask(p => ({...p, type: e.target.value as any}))}
                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-mint">
                    <option value="telegram">Telegram</option>
                    <option value="external">External</option>
                  </select>
                  <input type="number" value={newTask.reward_mint || ''} onChange={e => setNewTask(p => ({...p, reward_mint: Number(e.target.value)}))}
                    placeholder="Reward $MINT" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                </div>
                <input value={newTask.url} onChange={e => setNewTask(p => ({...p, url: e.target.value}))}
                  placeholder="URL (external tasks)" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <button onClick={handleCreateTask} disabled={!newTask.title || !newTask.reward_mint}
                  className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm disabled:opacity-50 active:scale-[0.97] transition-transform">
                  Create Task
                </button>
              </div>
            </div>
            {/* Task list */}
            {tasks.map(t => (
              <div key={t.id} className="surface-card rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.type} • +{Number(t.reward_mint)} $MINT</p>
                </div>
                <button onClick={() => handleToggleTask(t.id, t.is_active)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${t.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Promo codes */}
        {activeTab === 'promos' && (
          <div className="space-y-4">
            <div className="surface-card rounded-xl p-4">
              <p className="font-semibold text-sm mb-3">Generate Promo Code</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="number" value={newPromo.reward_mint || ''} onChange={e => setNewPromo(p => ({...p, reward_mint: Number(e.target.value)}))}
                    placeholder="Reward $MINT" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                  <input type="number" value={newPromo.max_uses || ''} onChange={e => setNewPromo(p => ({...p, max_uses: Number(e.target.value)}))}
                    placeholder="Max uses" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                </div>
                <button onClick={handleCreatePromo} disabled={!newPromo.reward_mint}
                  className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm disabled:opacity-50 active:scale-[0.97] transition-transform">
                  Generate Code
                </button>
              </div>
            </div>
            {promoCodes.map(p => (
              <div key={p.id} className="surface-card rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold">{p.code}</p>
                  <p className="text-[10px] text-muted-foreground">+{Number(p.reward_mint)} $MINT • {p.current_uses}/{p.max_uses || '∞'} uses</p>
                </div>
                <button onClick={() => handleTogglePromo(p.id, p.is_active)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${p.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                  {p.is_active ? 'Active' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {!settings && (
              <div className="surface-card rounded-xl p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-mint mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading settings...</p>
              </div>
            )}

            {/* One-time database setup */}
            <div className="surface-card rounded-xl p-4">
              <p className="font-semibold text-sm mb-1">Database Setup</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Run this once to add swap rate columns to the database. Safe to run multiple times.
              </p>
              {migrationStatus === 'ok' && (
                <p className="text-[11px] text-mint mb-2">Migration applied! Swap rate controls are now active.</p>
              )}
              {migrationStatus === 'err' && (
                <p className="text-[11px] text-destructive mb-2">Migration failed — the function may not be deployed yet.</p>
              )}
              <button
                onClick={handleApplyMigration}
                disabled={migrationStatus === 'running' || migrationStatus === 'ok'}
                className="w-full py-2 rounded-lg bg-muted border border-border text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {migrationStatus === 'running' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                ) : migrationStatus === 'ok' ? (
                  <><Check className="w-4 h-4 text-mint" /> Done</>
                ) : (
                  'Apply Database Migration'
                )}
              </button>
            </div>

            {settings && (
              <>
                {/* Swap Rates */}
                <div className="surface-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft className="w-4 h-4 text-mint" />
                    <p className="font-semibold text-sm">Swap Rates</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    These rates apply instantly across the app — no restart needed.
                  </p>
                  {[
                    { key: 'mint_ton_rate', label: '$MINT per 1 TON', hint: 'e.g. 10000' },
                    { key: 'usdt_ton_rate', label: 'USDT per 1 TON', hint: 'e.g. 6.5' },
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">{field.label}</label>
                        <p className="text-[10px] text-muted-foreground/60">{field.hint}</p>
                      </div>
                      <input type="number" value={settings[field.key] ?? ''} step="any"
                        onChange={e => setSettings((s: any) => ({...s, [field.key]: Number(e.target.value)}))}
                        className="w-28 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-mint" />
                    </div>
                  ))}
                  <div className="py-2 px-3 rounded-lg bg-muted text-[11px] text-muted-foreground">
                    Preview: 1 TON = <span className="text-mint font-mono">{Number(settings.mint_ton_rate || 10000).toLocaleString()} $MINT</span>
                    {' '}or <span className="text-mint font-mono">{Number(settings.usdt_ton_rate || 6.5)} USDT</span>
                  </div>
                  {swapSaveStatus === 'err' && (
                    <div className="text-[11px] text-destructive px-1">
                      Column missing. Run in Supabase SQL Editor:<br />
                      <code className="font-mono bg-muted px-1 rounded">ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS mint_ton_rate NUMERIC NOT NULL DEFAULT 10000, ADD COLUMN IF NOT EXISTS usdt_ton_rate NUMERIC NOT NULL DEFAULT 6.5;</code>
                    </div>
                  )}
                  {swapSaveStatus === 'ok' && (
                    <p className="text-[11px] text-mint">Saved! Rates updated instantly across the app.</p>
                  )}
                  <button
                    onClick={handleSaveSwapRates}
                    disabled={swapSaveStatus === 'saving'}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {swapSaveStatus === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Swap Rates'}
                  </button>
                </div>

                {/* Reward Settings */}
                <div className="surface-card rounded-xl p-4 space-y-3">
                  <p className="font-semibold text-sm mb-1">Reward Settings</p>
                  {[
                    { key: 'tap_reward_mint', label: 'Tap Reward ($MINT)' },
                    { key: 'ad_reward_mint', label: 'Ad Reward ($MINT)' },
                    { key: 'farming_reward_mint', label: 'Farming Reward ($MINT)' },
                    { key: 'farming_cycle_hours', label: 'Farming Cycle (hours)' },
                    { key: 'max_energy', label: 'Max Energy' },
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-3">
                      <label className="text-xs text-muted-foreground flex-1">{field.label}</label>
                      <input type="number" value={settings[field.key] ?? ''} step="any"
                        onChange={e => setSettings((s: any) => ({...s, [field.key]: Number(e.target.value)}))}
                        className="w-24 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-mint" />
                    </div>
                  ))}
                  <button onClick={handleSaveRewards}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform">
                    Save Rewards
                  </button>
                </div>

                {/* Referral & Withdrawal */}
                <div className="surface-card rounded-xl p-4 space-y-3">
                  <p className="font-semibold text-sm mb-1">Referral & Withdrawal</p>
                  {[
                    { key: 'referral_usdt', label: 'Referral USDT Reward' },
                    { key: 'referral_l1_percent', label: 'L1 Commission %' },
                    { key: 'referral_l2_percent', label: 'L2 Commission %' },
                    { key: 'referral_l3_percent', label: 'L3 Commission %' },
                    { key: 'min_withdrawal_ton', label: 'Min Withdrawal (TON)' },
                    { key: 'withdrawal_fee_percent', label: 'Withdrawal Fee %' },
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-3">
                      <label className="text-xs text-muted-foreground flex-1">{field.label}</label>
                      <input type="number" value={settings[field.key] ?? ''} step="any"
                        onChange={e => setSettings((s: any) => ({...s, [field.key]: Number(e.target.value)}))}
                        className="w-24 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-mint" />
                    </div>
                  ))}
                  <button onClick={handleSaveReferral}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform">
                    Save Referral & Withdrawal
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: boolean }) {
  return (
    <div className="surface-card rounded-xl p-4 text-center">
      <Icon className="w-5 h-5 text-mint mx-auto mb-1" />
      <p className={`font-mono text-2xl font-bold ${color ? 'text-mint' : ''}`}>{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
