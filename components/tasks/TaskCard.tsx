"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, ArrowUpIcon, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import type { Assignee, Task, TaskPriority } from "./types";
import { KanbanItemHandle } from "@/components/reui/kanban";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function priorityBorder(priority: TaskPriority) {
  switch (priority) {
    case "LOW":
      return "border-l-zinc-300";
    case "MEDIUM":
      return "border-l-blue-400";
    case "HIGH":
      return "border-l-orange-400";
    case "URGENT":
      return "border-l-red-500";
  }
}

export function TaskCard({
  task,
  assignee,
  mode,
  onOpen,
  onDelete,
}: {
  task: Task;
  assignee?: Assignee;
  mode: "admin" | "client";
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const due = typeof task.dueDate === "number" ? new Date(task.dueDate) : null;
  const overdue = due ? due.getTime() < Date.now() : false;

  const progress = task.progress ?? 0;

  // Mock votes based on priority to match the visual prototype
  let votes = 0;
  if (task.priority === "LOW") votes = 12;
  if (task.priority === "MEDIUM") votes = 45;
  if (task.priority === "HIGH") votes = 120;
  if (task.priority === "URGENT") votes = 350;

  const desc = typeof task.description === "string" ? task.description : "No description provided.";

  const content = (
    <Frame variant="ghost" spacing="sm" className="p-0">
      <FramePanel 
        className={cn("p-3 border-l-4 cursor-pointer hover:border-brand/40 transition-colors", priorityBorder(task.priority))} 
        onClick={onOpen}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{task.title}</span>
            {mode === "admin" && (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-subtle hover:text-ink"
                    aria-label="Task actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 font-ui">
                    <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => onOpen()}>
                      View details
                    </DropdownMenuItem>
                    {onDelete ? (
                      <DropdownMenuItem className="cursor-pointer text-sm" variant="destructive" onClick={() => onDelete()}>
                        Delete
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {desc}
          </p>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {progress}% complete
            </span>
            <div className="flex items-center gap-3">
              {assignee && (
                <img
                  src={resolveUserAvatarUrl(assignee.avatar, assignee.id)}
                  alt=""
                  className="h-5 w-5 rounded-full border border-border object-cover"
                />
              )}
              {due && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold",
                    overdue
                      ? "border-orange-300 bg-orange-50 text-orange-800"
                      : "border-border bg-surface text-muted-foreground"
                  )}
                >
                  {format(due, "MMM d")}
                </span>
              )}
              <div className="flex items-center gap-1">
                <ArrowUpIcon className="text-muted-foreground size-3" />
                <span className="text-muted-foreground text-xs tabular-nums">
                  {votes}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FramePanel>
    </Frame>
  );

  return mode === "admin" ? (
    <KanbanItemHandle>{content}</KanbanItemHandle>
  ) : (
    content
  );
}
