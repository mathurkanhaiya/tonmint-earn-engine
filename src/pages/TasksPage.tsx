import { useState } from "react";
import { useUserStore } from "@/lib/store";
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

const DEMO_TASKS: Task[] = [
  {
    id: "1",
    title: "Join TonMint Channel",
    description: "Join our official Telegram channel",
    reward: 50,
    type: "telegram",
    link: "https://t.me/tonmint",
  },
  {
    id: "2",
    title: "Join TonMint Chat",
    description: "Join the community discussion group",
    reward: 30,
    type: "telegram",
    link: "https://t.me/tonmint_chat",
  },
  {
    id: "3",
    title: "Follow on X",
    description: "Follow our official X account",
    reward: 40,
    type: "external",
    link: "https://x.com/tonmint",
  },
  {
    id: "4",
    title: "Visit Website",
    description: "Visit the TonMint official website",
    reward: 20,
    type: "external",
    link: "https://tonmint.app",
  },
];

export default function TasksPage() {
  const { addMint } = useUserStore();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());

  const handleStartTask = (task: Task) => {
    if (completedTasks.has(task.id) || pendingTasks.has(task.id)) return;
    window.open(task.link, "_blank");
    setPendingTasks((prev) => new Set(prev).add(task.id));

    // Simulate verification after 3 seconds
    setTimeout(() => {
      setPendingTasks((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setCompletedTasks((prev) => new Set(prev).add(task.id));
      addMint(task.reward);
    }, 3000);
  };

  return (
    <div className="flex flex-col px-4 pb-24 min-h-screen">
      <div className="w-full text-center pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          Earn <span className="text-mint">Tasks</span>
        </h1>
      </div>

      <BalanceHeader />

      <p className="text-xs text-muted-foreground text-center mt-1 mb-6 animate-fade-up">
        Complete tasks to earn $MINT rewards
      </p>

      <div className="space-y-3 max-w-sm mx-auto w-full">
        {DEMO_TASKS.map((task, i) => {
          const isCompleted = completedTasks.has(task.id);
          const isPending = pendingTasks.has(task.id);

          return (
            <div
              key={task.id}
              className="surface-card rounded-xl p-4 animate-fade-up"
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
                  <span className="font-mono text-sm text-mint font-medium flex items-center gap-1">
                    +{task.reward}
                    <img src={TOKEN_ICONS.MINT} alt="" className="w-3.5 h-3.5" />
                  </span>

                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-mint" />
                  ) : isPending ? (
                    <Clock className="w-5 h-5 text-secondary animate-spin" />
                  ) : (
                    <button
                      onClick={() => handleStartTask(task)}
                      className="p-2 rounded-lg bg-mint text-primary-foreground transition-all duration-200 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
