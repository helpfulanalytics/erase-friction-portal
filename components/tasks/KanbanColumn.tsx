"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "./types";

export function KanbanColumn({
  status,
  title,
  count,
  mode,
  children,
  onAddTask,
}: {
  status: TaskStatus;
  title: string;
  count: number;
  mode: "admin" | "client";
  tasks?: Task[];
  children: React.ReactNode;
  onAddTask?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[520px] flex-col rounded-2xl border border-border bg-surface p-4 shadow-card",
        isOver && mode === "admin" && "ring-2 ring-brand/40"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-headingAlt text-base font-bold text-ink">{title}</div>
          <div className="mt-0.5 inline-flex items-center gap-2 font-ui text-xs text-muted-foreground">
            <span className="inline-flex items-center justify-center rounded-full border border-border bg-subtle px-2 py-0.5 font-semibold">
              {count}
            </span>
            tasks
          </div>
        </div>

        {mode === "admin" && onAddTask ? (
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 font-ui text-xs font-semibold text-ink transition-colors hover:bg-subtle"
          >
            <Plus className="size-4" />
            Add
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-3">{children}</div>
    </div>
  );
}

