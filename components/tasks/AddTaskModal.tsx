"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Assignee, TaskPriority, TaskStatus } from "./types";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export function AddTaskModal({
  open,
  onOpenChange,
  assignees,
  defaultStatus,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: Assignee[];
  defaultStatus: TaskStatus;
  onSubmit: (values: {
    title: string;
    description: string;
    progress: number;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeId: string | null;
    dueDate: string;
  }) => Promise<void> | void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [progress, setProgress] = React.useState<number>(0);
  const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [assigneeId, setAssigneeId] = React.useState<string | "">("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    setStatus(defaultStatus);
  }, [defaultStatus, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit({
        title,
        description,
        progress,
        priority,
        status,
        assigneeId: assigneeId || null,
        dueDate,
      });
      setTitle("");
      setDescription("");
      setProgress(0);
      setPriority("MEDIUM");
      setAssigneeId("");
      setDueDate("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>Create a new task for this project.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 font-ui text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="font-ui text-xs font-semibold text-ink" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="e.g. Finalize homepage copy"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-ui text-xs font-semibold text-ink" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] w-full rounded-lg border border-border bg-surface p-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y"
              placeholder="Add details about this task..."
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-ui text-xs font-semibold text-ink" htmlFor="progress">
                Progress
              </label>
              <span className="font-ui text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <input
              id="progress"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-semibold text-ink" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-ui text-xs font-semibold text-ink" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="font-ui text-xs font-semibold text-ink" htmlFor="assignee">
                Assignee
              </label>
              <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-ui text-xs font-semibold text-ink" htmlFor="due">
                Due date
              </label>
              <input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
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
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={busy}
            >
              {busy ? "Creating…" : "Create task"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

