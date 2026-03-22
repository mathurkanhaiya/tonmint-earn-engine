import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Eye, Zap, Settings, ListChecks,
  ArrowUpRight, ArrowRightLeft, Gift, Shield, ChevronDown, ChevronUp,
  Check, X, Loader2, Copy, Bell, Activity, Calendar
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalAdsWatched: number;
  totalMintGenerated: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalDailyDrops: number;
}

interface UserRow {
  id: string;
  user_id: string;
  display_name: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  mint_balance: number;
  usdt_balance: number;
  ton_balance: number;
  energy: number;
  total_taps: number;
  total_ads_watched: number;
  boost_count: number;
  daily_drop_streak: number;
  referral_count: number;
  created_at: string;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: boolean }) {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color ? 'text-mint' : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`font-mono text-xl font-bold ${color ? 'text-mint' : ''}`}>{value}</p>
    </div>
  );
}

export default function AdminPanel() {
  const { isAdmin, user, session } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalAdsWatched: 0, totalMintGenerated: 0,
    totalWithdrawals: 0, pendingWithdrawals: 0, totalDailyDrops: 0,
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'external' as 'telegram' | 'external', reward_mint: 0, url: '', telegram_channel: '' });
  const [newPromo, setNewPromo] = useState({ reward_mint: 0, max_uses: 100 });
  const [swapSaveStatus, setSwapSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [notifyTaskStatus, setNotifyTaskStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(), loadUsers(), loadWithdrawals(), loadTasks(),
      loadPromoCodes(), loadSettings(), loadActivity()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    const [{ data: profiles }, { data: wds }, { data: drops }] = await Promise.all([
      supabase.from('profiles').select('mint_balance, total_ads_watched'),
      supabase.from('withdrawals').select('status'),
      supabase.from('daily_drops').select('id'),
    ]);
    if (profiles) {
      setStats(prev => ({
        ...prev,
        totalUsers: profiles.length,
        totalAdsWatched: profiles.reduce((sum, p) => sum + (p.total_ads_watched || 0), 0),
        totalMintGenerated: profiles.reduce((sum, p) => sum + Number(p.mint_balance || 0), 0),
      }));
    }
    if (wds) {
      setStats(prev => ({
        ...prev,
        totalWithdrawals: wds.length,
        pendingWithdrawals: wds.filter(w => w.status === 'pending').length,
      }));
    }
    if (drops) {
      setStats(prev => ({ ...prev, totalDailyDrops: drops.length }));
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserRow[]);
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

  const loadActivity = async () => {
    const { data } = await supabase.from('user_activity').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setActivity(data);
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('withdrawals').update({
      status, processed_at: new Date().toISOString(),
    }).eq('id', id);
    loadWithdrawals();
    loadStats();
  };

  const handleCopyWallet = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedWallet(address);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.reward_mint) return;
    await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      type: newTask.type,
      reward_mint: newTask.reward_mint,
      url: newTask.url || null,
      telegram_channel: newTask.telegram_channel || null,
    });
    setNewTask({ title: '', description: '', type: 'external', reward_mint: 0, url: '', telegram_channel: '' });
    loadTasks();
  };

  const handleCreateTaskAndNotify = async () => {
    await handleCreateTask();
    setNotifyTaskStatus('sending');
    try {
      const res = await fetch('/api/notify/new-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: newTask.title, taskReward: newTask.reward_mint }),
      });
      const data = await res.json();
      setNotifyTaskStatus(data.sent ? 'ok' : 'err');
    } catch {
      setNotifyTaskStatus('err');
    }
    setTimeout(() => setNotifyTaskStatus('idle'), 3000);
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
      code, reward_mint: newPromo.reward_mint, max_uses: newPromo.max_uses,
    });
    setNewPromo({ reward_mint: 0, max_uses: 100 });
    loadPromoCodes();
  };

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !isActive }).eq('id', id);
    loadPromoCodes();
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

  const handleSendReminder = async () => {
    if (!session?.access_token) return;
    setReminderStatus('sending');
    try {
      const res = await fetch('/api/notify/daily-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const data = await res.json();
      setReminderStatus(data.sent ? 'ok' : 'err');
    } catch {
      setReminderStatus('err');
    }
    setTimeout(() => setReminderStatus('idle'), 4000);
  };

  const getUserActivity = (userId: string) => activity.filter(a => a.user_id === userId).slice(0, 8);

  const activityIcon = (type: string) => {
    const map: Record<string, string> = {
      task_complete: '✅', watch_ad: '👁️', farming_start: '🌱', farming_claim: '🌾',
      swap: '🔄', withdrawal_request: '💸', promo_code: '🎁', daily_drop: '📅',
      boost_ad_percent: '⚡', boost_ad_refill: '🔋',
    };
    return map[type] || '•';
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
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'promos', label: 'Promos', icon: Gift },
    { id: 'notify', label: 'Notify', icon: Bell },
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
              <StatCard icon={Eye} label="Ads Watched" value={stats.totalAdsWatched} />
              <StatCard icon={Zap} label="$MINT Generated" value={Math.round(stats.totalMintGenerated).toLocaleString()} color />
              <StatCard icon={ArrowUpRight} label="Pending Withdrawals" value={stats.pendingWithdrawals} />
              <StatCard icon={Calendar} label="Daily Drops" value={stats.totalDailyDrops} />
              <StatCard icon={ArrowRightLeft} label="Total Withdrawals" value={stats.totalWithdrawals} />
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="surface-card rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold">{u.display_name || u.telegram_username || 'Anonymous'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">TG: {u.telegram_id || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono text-sm text-mint">{Number(u.mint_balance).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">$MINT</p>
                    </div>
                    {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {expandedUser === u.id && (
                  <div className="px-3 pb-3 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-2 my-2">
                      {[
                        { label: 'TON', value: Number(u.ton_balance || 0).toFixed(3) },
                        { label: 'USDT', value: Number(u.usdt_balance || 0).toFixed(2) },
                        { label: 'Energy', value: u.energy || 0 },
                        { label: 'Taps', value: u.total_taps || 0 },
                        { label: 'Ads', value: u.total_ads_watched || 0 },
                        { label: 'Boosts', value: u.boost_count ?? 10 },
                        { label: 'Streak', value: `${u.daily_drop_streak || 0}/7` },
                        { label: 'Referrals', value: u.referral_count || 0 },
                      ].map(item => (
                        <div key={item.label} className="bg-muted rounded-lg p-2 text-center">
                          <p className="font-mono text-xs font-bold">{item.value}</p>
                          <p className="text-[9px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Recent activity for this user */}
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Recent Activity</p>
                    <div className="space-y-1">
                      {getUserActivity(u.user_id).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">No activity recorded</p>
                      ) : getUserActivity(u.user_id).map((a: any) => (
                        <div key={a.id} className="flex items-center gap-2 text-[10px]">
                          <span>{activityIcon(a.action_type)}</span>
                          <span className="text-muted-foreground capitalize">{a.action_type.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground/60 ml-auto">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No users yet</p>}
          </div>
        )}

        {/* Activity Feed */}
        {activeTab === 'activity' && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <button onClick={loadActivity} className="text-xs text-mint flex items-center gap-1">
                <Loader2 className="w-3 h-3" /> Refresh
              </button>
            </div>
            {activity.map(a => (
              <div key={a.id} className="surface-card rounded-xl p-3 flex items-center gap-3">
                <span className="text-lg">{activityIcon(a.action_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{a.action_type.replace(/_/g, ' ')}</p>
                  {a.details && Object.keys(a.details).length > 0 && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {JSON.stringify(a.details)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {activity.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No activity yet</p>}
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
                    <p className="text-[10px] text-muted-foreground">Net: {Number(w.net_ton || 0).toFixed(4)} TON</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>{w.status}</span>
                </div>

                {/* Click to copy wallet */}
                <button
                  onClick={() => handleCopyWallet(w.wallet_address)}
                  className="flex items-center gap-1.5 w-full text-left py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors mb-2"
                >
                  <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">{w.wallet_address}</span>
                  {copiedWallet === w.wallet_address ? (
                    <Check className="w-3 h-3 text-mint flex-shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

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
            <div className="surface-card rounded-xl p-4">
              <p className="font-semibold text-sm mb-3">Create Task</p>
              <div className="space-y-2">
                <input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))}
                  placeholder="Task title *" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <input value={newTask.description} onChange={e => setNewTask(p => ({...p, description: e.target.value}))}
                  placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <div className="flex gap-2">
                  <select value={newTask.type} onChange={e => setNewTask(p => ({...p, type: e.target.value as any}))}
                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-mint">
                    <option value="telegram">Telegram</option>
                    <option value="external">External</option>
                  </select>
                  <input type="number" value={newTask.reward_mint || ''} onChange={e => setNewTask(p => ({...p, reward_mint: Number(e.target.value)}))}
                    placeholder="Reward $MINT *" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                </div>
                <input value={newTask.url} onChange={e => setNewTask(p => ({...p, url: e.target.value}))}
                  placeholder="URL (for external tasks)" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <input value={newTask.telegram_channel} onChange={e => setNewTask(p => ({...p, telegram_channel: e.target.value}))}
                  placeholder="Telegram channel (without @)" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint" />
                <div className="flex gap-2">
                  <button onClick={handleCreateTask} disabled={!newTask.title || !newTask.reward_mint}
                    className="flex-1 py-2 rounded-lg bg-muted border border-border text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform">
                    Create (No Notify)
                  </button>
                  <button onClick={handleCreateTaskAndNotify} disabled={!newTask.title || !newTask.reward_mint || notifyTaskStatus === 'sending'}
                    className="flex-1 py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm disabled:opacity-50 active:scale-[0.97] transition-transform flex items-center justify-center gap-1">
                    {notifyTaskStatus === 'sending' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Notifying...</>
                      : notifyTaskStatus === 'ok' ? <><Check className="w-3.5 h-3.5" /> Sent!</>
                      : <><Bell className="w-3.5 h-3.5" /> Create + Notify All</>}
                  </button>
                </div>
              </div>
            </div>
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

        {/* Promo Codes */}
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
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold">{p.code}</p>
                    <button onClick={() => { navigator.clipboard.writeText(p.code); }}>
                      <Copy className="w-3 h-3 text-muted-foreground hover:text-mint" />
                    </button>
                  </div>
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

        {/* Notifications */}
        {activeTab === 'notify' && (
          <div className="space-y-4">
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-mint" />
                <p className="font-semibold text-sm">Broadcast Notifications</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4">
                Send real-time notifications to all users who have started the Telegram bot.
              </p>

              <div className="space-y-3">
                <div className="surface-card rounded-xl p-3 border border-border">
                  <p className="text-sm font-semibold mb-1">⏰ Daily Reminder</p>
                  <p className="text-[11px] text-muted-foreground mb-2">Remind all users to log in and claim daily rewards</p>
                  <button
                    onClick={handleSendReminder}
                    disabled={reminderStatus === 'sending'}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm disabled:opacity-60 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                  >
                    {reminderStatus === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      : reminderStatus === 'ok' ? <><Check className="w-4 h-4" /> Sent!</>
                      : reminderStatus === 'err' ? 'Failed - Check bot token'
                      : 'Send Daily Reminder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {!settings ? (
              <div className="surface-card rounded-xl p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-mint mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading settings...</p>
              </div>
            ) : (
              <>
                {/* Swap Rates */}
                <div className="surface-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft className="w-4 h-4 text-mint" />
                    <p className="font-semibold text-sm">Swap Rates</p>
                  </div>
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
                  {swapSaveStatus === 'ok' && <p className="text-[11px] text-mint">Saved!</p>}
                  {swapSaveStatus === 'err' && <p className="text-[11px] text-destructive">Save failed</p>}
                  <button onClick={handleSaveSwapRates} disabled={swapSaveStatus === 'saving'}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform disabled:opacity-60">
                    {swapSaveStatus === 'saving' ? 'Saving...' : 'Save Swap Rates'}
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
                        className="w-28 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-mint" />
                    </div>
                  ))}
                  <button onClick={handleSaveRewards}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform">
                    Save Reward Settings
                  </button>
                </div>

                {/* Referral & Withdrawal Settings */}
                <div className="surface-card rounded-xl p-4 space-y-3">
                  <p className="font-semibold text-sm mb-1">Referral & Withdrawal</p>
                  {[
                    { key: 'referral_usdt', label: 'Referral USDT Reward' },
                    { key: 'referral_l1_percent', label: 'Level 1 Commission (%)' },
                    { key: 'referral_l2_percent', label: 'Level 2 Commission (%)' },
                    { key: 'referral_l3_percent', label: 'Level 3 Commission (%)' },
                    { key: 'min_withdrawal_ton', label: 'Min Withdrawal (TON)' },
                    { key: 'withdrawal_fee_percent', label: 'Withdrawal Fee (%)' },
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-3">
                      <label className="text-xs text-muted-foreground flex-1">{field.label}</label>
                      <input type="number" value={settings[field.key] ?? ''} step="any"
                        onChange={e => setSettings((s: any) => ({...s, [field.key]: Number(e.target.value)}))}
                        className="w-28 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm font-mono text-right focus:outline-none focus:ring-1 focus:ring-mint" />
                    </div>
                  ))}
                  <button onClick={handleSaveReferral}
                    className="w-full py-2 rounded-lg bg-mint text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform">
                    Save Referral Settings
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
