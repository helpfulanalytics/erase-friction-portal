"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Assignee, Task, TaskPriority, TaskStatus } from "./types";
import { AssetPickerModal } from "@/components/assets/AssetPickerModal";
import type { Asset } from "@/components/assets/types";
import { toast } from "sonner";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function badgeTone(kind: "priority" | "status", value: string) {
  const v = value.toUpperCase();
  if (kind === "priority") {
    if (v === "URGENT") return "border-red-300 bg-red-50 text-red-800";
    if (v === "HIGH") return "border-orange-300 bg-orange-50 text-orange-800";
    if (v === "MEDIUM") return "border-blue-300 bg-blue-50 text-blue-800";
    return "border-border bg-subtle text-muted-foreground";
  }
  if (v === "DONE") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (v === "IN_REVIEW") return "border-blue-300 bg-blue-50 text-blue-800";
  if (v === "IN_PROGRESS") return "border-orange-300 bg-orange-50 text-orange-800";
  return "border-border bg-subtle text-muted-foreground";
}

function descriptionToText(desc: unknown): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  try {
    return JSON.stringify(desc, null, 2);
  } catch {
    return "";
  }
}

export function TaskDetailPanel({
  open,
  onOpenChange,
  task,
  assignees,
  mode,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  assignees: Assignee[];
  mode: "admin" | "client";
  onSave: (patch: Partial<Pick<Task, "title" | "priority" | "status" | "assigneeId" | "dueDate" | "description" | "attachments">>) => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = React.useState<TaskStatus>("TODO");
  const [assigneeId, setAssigneeId] = React.useState<string | "">("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [assetOpen, setAssetOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setPriority(task.priority);
    setStatus(task.status);
    setAssigneeId(task.assigneeId ?? "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setDescription(descriptionToText(task.description));
  }, [task]);

  async function save() {
    if (!task) return;
    setBusy(true);
    try {
      await onSave({
        title,
        priority,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).getTime() : null,
        description: description ? description : null,
      });
    } finally {
      setBusy(false);
    }
  }

  async function attachAsset(asset: Asset) {
    if (!task) return;
    const next = Array.from(new Set([...(task.attachments ?? []), asset.url])).slice(0, 20);
    await onSave({ attachments: next });
    toast.success("Attached asset.");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-10">
            <div>
              <SheetTitle>Task</SheetTitle>
              <SheetDescription>
                {task ? `#${task.id.slice(0, 6)}` : "—"}
              </SheetDescription>
            </div>
            {task ? (
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-1 font-ui text-xs font-semibold", badgeTone("priority", priority))}>
                  {priority}
                </span>
                <span className={cn("rounded-full border px-2 py-1 font-ui text-xs font-semibold", badgeTone("status", status))}>
                  {status.replaceAll("_", " ")}
                </span>
              </div>
            ) : null}
          </div>
        </SheetHeader>

        <SheetBody>
          {!task ? (
            <div className="font-ui text-sm text-muted-foreground">No task selected.</div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="font-ui text-xs font-semibold text-ink">Title</label>
                {mode === "admin" ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-subtle px-3 py-3 font-ui text-sm text-ink">
                    {title}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="font-ui text-xs font-semibold text-ink">Priority</label>
                  {mode === "admin" ? (
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-border bg-subtle px-3 py-3 font-ui text-sm text-ink">
                      {priority}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-ui text-xs font-semibold text-ink">Status</label>
                  {mode === "admin" ? (
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-border bg-subtle px-3 py-3 font-ui text-sm text-ink">
                      {status.replaceAll("_", " ")}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="font-ui text-xs font-semibold text-ink">Assignee</label>
                  {mode === "admin" ? (
                    <select
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
                  ) : (
                    <div className="rounded-lg border border-border bg-subtle px-3 py-3 font-ui text-sm text-ink">
                      {assignees.find((a) => a.id === assigneeId)?.name ?? "Unassigned"}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-ui text-xs font-semibold text-ink">Due date</label>
                  {mode === "admin" ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  ) : (
                    <div className="rounded-lg border border-border bg-subtle px-3 py-3 font-ui text-sm text-ink">
                      {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "—"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-ui text-xs font-semibold text-ink">Description</label>
                {mode === "admin" ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    placeholder="(Plate JSON for v1 can be pasted here or left empty)"
                  />
                ) : (
                  <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-subtle p-3 font-ui text-xs text-ink">
                    {description || "—"}
                  </pre>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-ui text-xs font-semibold text-ink">Attachments</label>
                <div className="rounded-lg border border-border bg-subtle p-3">
                  {(task.attachments?.length ?? 0) === 0 ? (
                    <div className="font-ui text-sm text-muted-foreground">No attachments.</div>
                  ) : (
                    <div className="space-y-2">
                      {(task.attachments ?? []).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-ui text-sm font-semibold text-ink underline"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {mode === "admin" ? (
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                    onClick={() => setAssetOpen(true)}
                  >
                    Attach file
                  </button>
                ) : null}
              </div>

              {mode === "admin" ? (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                    onClick={() => onOpenChange(false)}
                    disabled={busy}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                    onClick={save}
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>

      {task ? (
        <AssetPickerModal
          open={assetOpen}
          onOpenChange={setAssetOpen}
          projectId={task.projectId}
          onPick={attachAsset}
        />
      ) : null}
    </Sheet>
  );
}

