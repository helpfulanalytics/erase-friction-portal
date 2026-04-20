"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Project = { id: string; name?: string };
type Task = { id: string; title?: string };

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hhmmToMins(s: string) {
  const m = s.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function LogTimeModal({
  open,
  onOpenChange,
  projects,
  tasks,
  defaultProjectId,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  defaultProjectId?: string | null;
  userId: string;
}) {
  const [date, setDate] = React.useState(() => toYMD(new Date()));
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? (projects[0]?.id ?? ""));
  const [taskId, setTaskId] = React.useState<string>("NONE");
  const [duration, setDuration] = React.useState("01:00");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!projectId && projects[0]?.id) setProjectId(projects[0].id);
  }, [open, projectId, projects]);

  async function submit() {
    const mins = hhmmToMins(duration);
    if (mins === null) {
      toast.error("Duration must be HH:MM");
      return;
    }
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    setBusy(true);
    try {
      await fetchJson("/api/time", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description,
          duration: mins,
          date,
          startTime: null,
          endTime: null,
        }),
      });
      toast.success("Time logged.");
      onOpenChange(false);
      setDescription("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log time.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
          <DialogDescription>Add a manual time entry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Date</div>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Duration (HH:MM)</div>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
              />
            </label>
          </div>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Project</div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Project"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Task (optional)</div>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              <option value="NONE">No task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title ?? "Task"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Description</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-headingAlt text-sm text-ink"
              placeholder="What did you work on?"
            />
          </label>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

