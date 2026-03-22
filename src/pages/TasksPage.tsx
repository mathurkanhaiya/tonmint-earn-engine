import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { syncMintBalance } from "@/lib/supabaseSync";
import { supabase } from "@/integrations/supabase/client";
import { TOKEN_ICONS } from "@/lib/constants";
import { ExternalLink, CheckCircle, Clock, Loader2 } from "lucide-react";
import BalanceHeader from "@/components/BalanceHeader";

interface DBTask {
  id: string;
  title: string;
  description: string | null;
  type: "telegram" | "external";
  reward_mint: number;
  url: string | null;
  telegram_channel: string | null;
  is_active: boolean;
}

interface CompletedTask {
  task_id: string;
  status: string;
}

export default function TasksPage() {
  const { addMint, mintBalance, isInitialized } = useUserStore();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DBTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const [{ data: taskData }, { data: userTaskData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        user?.id
          ? supabase.from('user_tasks').select('task_id, status').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (taskData) setTasks(taskData as DBTask[]);
      if (userTaskData) {
        setCompletedTaskIds(new Set((userTaskData as CompletedTask[]).map(t => t.task_id)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task: DBTask) => {
    if (completedTaskIds.has(task.id) || pendingTasks.has(task.id)) return;

    const link = task.url || (task.telegram_channel ? `https://t.me/${task.telegram_channel}` : null);
    if (link) window.open(link, "_blank");

    setPendingTasks(prev => new Set(prev).add(task.id));

    setTimeout(async () => {
      setPendingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });

      const newCompleted = new Set(completedTaskIds).add(task.id);
      setCompletedTaskIds(newCompleted);

      addMint(task.reward_mint);

      if (user?.id) {
        const current = useUserStore.getState().mintBalance;
        await Promise.all([
          syncMintBalance(user.id, current + task.reward_mint),
          supabase.from('user_tasks').upsert({
            user_id: user.id,
            task_id: task.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,task_id' }).then(() => {}),
          supabase.from('user_activity').insert({
            user_id: user.id,
            action_type: 'task_complete',
            details: { task_id: task.id, task_title: task.title, reward: task.reward_mint },
          }).then(() => {}),
        ]);
      }
    }, 3000);
  };

  const totalEarnable = tasks
    .filter(t => !completedTaskIds.has(t.id))
    .reduce((sum, t) => sum + Number(t.reward_mint), 0);

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Earn <span className="text-mint">Tasks</span>
        </h1>
      </div>

      <BalanceHeader />

      <p className="text-xs text-muted-foreground text-center mt-1 mb-2 animate-fade-up">
        Complete tasks to earn $MINT rewards
      </p>

      {totalEarnable > 0 && (
        <p className="text-[11px] text-mint text-center font-mono mb-5">
          +{totalEarnable} $MINT available
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-mint" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="surface-card rounded-xl p-6 text-center max-w-sm mx-auto w-full animate-fade-up">
          <p className="text-sm font-semibold">No tasks yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new tasks!</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-sm mx-auto w-full">
          {tasks.map((task, i) => {
            const isCompleted = completedTaskIds.has(task.id);
            const isPending = pendingTasks.has(task.id);

            return (
              <div
                key={task.id}
                className={`surface-card rounded-xl p-4 animate-fade-up transition-opacity ${isCompleted ? "opacity-60" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{task.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                        {task.type}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <span className={`font-mono text-sm font-medium flex items-center gap-1 ${isCompleted ? "text-muted-foreground" : "text-mint"}`}>
                      +{Number(task.reward_mint).toLocaleString()}
                      <img src={TOKEN_ICONS.MINT} alt="" className="w-3.5 h-3.5" />
                    </span>

                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-mint flex-shrink-0" />
                    ) : isPending ? (
                      <Clock className="w-5 h-5 text-secondary animate-spin flex-shrink-0" />
                    ) : (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="p-2 rounded-lg bg-mint text-primary-foreground transition-all duration-200 active:scale-95 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isPending && (
                  <p className="text-[11px] text-muted-foreground mt-2 animate-pulse">
                    Verifying... please wait
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && tasks.length > 0 && completedTaskIds.size === tasks.length && tasks.length > 0 && (
        <div className="surface-card rounded-xl p-4 mt-6 max-w-sm mx-auto w-full text-center">
          <CheckCircle className="w-8 h-8 text-mint mx-auto mb-2" />
          <p className="font-semibold text-sm">All tasks completed!</p>
          <p className="text-xs text-muted-foreground mt-1">Check back for new tasks soon.</p>
        </div>
      )}
    </div>
  );
}
