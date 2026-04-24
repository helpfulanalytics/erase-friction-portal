"use client";

import * as React from "react";
import { Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { LogTimeModal } from "@/components/time/LogTimeModal";
import { cn } from "@/lib/utils";

type Project = { id: string; name?: string };
type Task = { id: string; title?: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function TimerWidget({
  userId,
  projects,
  defaultProjectId,
  className,
}: {
  userId: string;
  projects: Project[];
  defaultProjectId?: string | null;
  className?: string;
}) {
  const [running, setRunning] = React.useState(false);
  const [startMs, setStartMs] = React.useState<number | null>(null);
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

  const [projectId, setProjectId] = React.useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [taskId, setTaskId] = React.useState<string>("NONE");
  const [description, setDescription] = React.useState("");

  const [logOpen, setLogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`);
        if (!cancelled) setTasks(res.tasks ?? []);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      fetchJson("/api/time/active", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description,
        }),
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [running, userId, projectId, taskId, description]);

  const elapsedMs = running && startMs ? nowMs - startMs : 0;

  async function start() {
    if (!projectId) {
      toast.error("Select a project.");
      return;
    }
    const startedAtMs = Date.now();
    try {
      await fetchJson("/api/time/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description,
          startedAtMs,
        }),
      });
    } catch {
      // non-blocking: time entry is still the source of truth for payment
    }
    setStartMs(startedAtMs);
    setNowMs(startedAtMs);
    setRunning(true);
  }

  async function stop() {
    if (!startMs) return;
    const end = Date.now();
    const date = toYMD(new Date(end));
    setRunning(false);
    try {
      await fetchJson(`/api/time/active?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }).catch(
        () => {}
      );
      await fetchJson("/api/time", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description,
          startTime: startMs,
          endTime: end,
          duration: null,
          date,
          source: "timer",
        }),
      });
      toast.success("Time entry created.");
      setDescription("");
      setTaskId("NONE");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save time entry.");
    } finally {
      setStartMs(null);
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              running ? "bg-brand" : "bg-muted-foreground/30"
            )}
          >
            {running ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
            ) : null}
          </span>
          <span className="font-ui text-xs font-semibold text-muted-foreground">TIMER</span>
        </div>

        <div className="font-ui text-xs tabular-nums text-ink w-[84px] text-center">
          {formatHMS(elapsedMs)}
        </div>

        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="h-8 max-w-[170px] rounded-md border border-border bg-surface px-2 font-ui text-xs text-ink"
          disabled={running}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name ?? "Project"}
            </option>
          ))}
        </select>

        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="h-8 max-w-[170px] rounded-md border border-border bg-surface px-2 font-ui text-xs text-ink"
          disabled={running}
        >
          <option value="NONE">No task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title ?? "Task"}
            </option>
          ))}
        </select>

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 w-[220px] rounded-md border border-border bg-surface px-2 font-headingAlt text-xs text-ink"
          placeholder="Description…"
          disabled={running}
        />

        <button
          type="button"
          onClick={running ? stop : start}
          className={cn(
            "inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 font-ui text-xs font-semibold",
            running ? "bg-brand text-ink" : "border border-border bg-surface text-ink hover:bg-subtle"
          )}
        >
          {running ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? "Stop" : "Start"}
        </button>

        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 font-ui text-xs font-semibold text-ink hover:bg-subtle"
        >
          <Timer className="size-3.5" />
          Log
        </button>
      </div>

      <LogTimeModal
        open={logOpen}
        onOpenChange={setLogOpen}
        projects={projects}
        tasks={tasks}
        defaultProjectId={projectId}
        userId={userId}
      />
    </div>
  );
}

