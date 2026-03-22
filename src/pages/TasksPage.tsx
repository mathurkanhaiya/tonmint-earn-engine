import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { syncMintBalance } from "@/lib/supabaseSync";
import { TOKEN_ICONS } from "@/lib/constants";
import { ExternalLink, CheckCircle, Clock } from "lucide-react";
import BalanceHeader from "@/components/BalanceHeader";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "telegram" | "external";
  link: string;
}

const TASKS: Task[] = [
  {
    id: "task_join_channel",
    title: "Join TonMint Channel",
    description: "Join our official Telegram channel",
    reward: 50,
    type: "telegram",
    link: "https://t.me/tonmint",
  },
  {
    id: "task_join_chat",
    title: "Join TonMint Chat",
    description: "Join the community discussion group",
    reward: 30,
    type: "telegram",
    link: "https://t.me/tonmint_chat",
  },
  {
    id: "task_follow_x",
    title: "Follow on X",
    description: "Follow our official X account",
    reward: 40,
    type: "external",
    link: "https://x.com/tonmint",
  },
  {
    id: "task_visit_website",
    title: "Visit Website",
    description: "Visit the TonMint official website",
    reward: 20,
    type: "external",
    link: "https://tonmint.app",
  },
];

const STORAGE_KEY = "tonmint_completed_tasks";

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompleted(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export default function TasksPage() {
  const { addMint, mintBalance, isInitialized } = useUserStore();
  const { user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(loadCompleted);
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());

  // Reload completed tasks once profile is ready (in case localStorage was from a different session)
  useEffect(() => {
    if (isInitialized) {
      setCompletedTasks(loadCompleted());
    }
  }, [isInitialized]);

  const handleStartTask = (task: Task) => {
    if (completedTasks.has(task.id) || pendingTasks.has(task.id)) return;
    window.open(task.link, "_blank");
    setPendingTasks((prev) => new Set(prev).add(task.id));

    setTimeout(async () => {
      setPendingTasks((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });

      const newCompleted = new Set(completedTasks).add(task.id);
      setCompletedTasks(newCompleted);
      saveCompleted(newCompleted);

      addMint(task.reward);

      // Sync new balance to Supabase
      if (user?.id) {
        const current = useUserStore.getState().mintBalance;
        await syncMintBalance(user.id, current);
      }
    }, 3000);
  };

  const totalEarnable = TASKS.filter((t) => !completedTasks.has(t.id)).reduce(
    (sum, t) => sum + t.reward,
    0
  );

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

      <div className="space-y-3 max-w-sm mx-auto w-full">
        {TASKS.map((task, i) => {
          const isCompleted = completedTasks.has(task.id);
          const isPending = pendingTasks.has(task.id);

          return (
            <div
              key={task.id}
              data-testid={`task-card-${task.id}`}
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <span className={`font-mono text-sm font-medium flex items-center gap-1 ${isCompleted ? "text-muted-foreground" : "text-mint"}`}>
                    +{task.reward}
                    <img src={TOKEN_ICONS.MINT} alt="" className="w-3.5 h-3.5" />
                  </span>

                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-mint flex-shrink-0" data-testid={`task-done-${task.id}`} />
                  ) : isPending ? (
                    <Clock className="w-5 h-5 text-secondary animate-spin flex-shrink-0" />
                  ) : (
                    <button
                      data-testid={`task-start-${task.id}`}
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

      {completedTasks.size === TASKS.length && (
        <div className="surface-card rounded-xl p-4 mt-6 max-w-sm mx-auto w-full text-center">
          <CheckCircle className="w-8 h-8 text-mint mx-auto mb-2" />
          <p className="font-semibold text-sm">All tasks completed!</p>
          <p className="text-xs text-muted-foreground mt-1">Check back for new tasks soon.</p>
        </div>
      )}
    </div>
  );
}
