"use client";

import * as React from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

import { KANBAN_COLUMNS, type Assignee, type Task, type TaskStatus } from "./types";
import { TaskCard } from "./TaskCard";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { AddTaskModal } from "./AddTaskModal";

import { Badge } from "@/components/reui/badge";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameFooter,
} from "@/components/reui/frame";
import {
  Kanban,
  KanbanBoard as ReuiKanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanOverlay,
  type KanbanMoveEvent
} from "@/components/reui/kanban";

type TasksResponse = { tasks: Task[]; assignees: Assignee[] };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function byOrder(a: Task, b: Task) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function groupByStatus(tasks: Task[]) {
  const map: Record<string, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  };
  for (const t of tasks) if (map[t.status]) map[t.status].push(t);
  for (const k of Object.keys(map)) map[k].sort(byOrder);
  return map;
}

function setOrders(tasks: Task[]) {
  return tasks.map((t, idx) => ({ ...t, order: idx }));
}

function toTaskPatchFromForm(values: { title: string; description: string; progress: number; priority: string; status: TaskStatus; assigneeId: string | null; dueDate: string }) {
  return {
    title: values.title,
    description: values.description,
    progress: values.progress,
    priority: values.priority,
    status: values.status,
    assigneeId: values.assigneeId,
    dueDate: values.dueDate ? new Date(values.dueDate).getTime() : null,
  };
}

const COLUMNS_META: Record<string, { title: string; color: string }> = {
  TODO: { title: "Todo", color: "bg-blue-500" },
  IN_PROGRESS: { title: "In Progress", color: "bg-yellow-500" },
  IN_REVIEW: { title: "In Review", color: "bg-purple-500" },
  DONE: { title: "Done", color: "bg-green-500" },
};

export function TasksBoard({
  projectId,
  mode,
}: {
  projectId: string;
  mode: "admin" | "client";
}) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchJson<TasksResponse>(`/api/projects/${projectId}/tasks`),
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = React.useState<TaskStatus>("TODO");

  const tasks = data?.tasks ?? [];
  const assignees = data?.assignees ?? [];
  const assigneeMap = React.useMemo(() => new Map(assignees.map((a) => [a.id, a])), [assignees]);

  const grouped = React.useMemo(() => groupByStatus(tasks), [tasks]);

  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  const createTask = useMutation({
    mutationFn: async (values: { title: string; description: string; progress: number; priority: string; status: TaskStatus; assigneeId: string | null; dueDate: string }) => {
      await fetchJson(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toTaskPatchFromForm(values)),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      await fetchJson(`/api/tasks/${taskId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const saveTask = useMutation({
    mutationFn: async (args: { taskId: string; patch: Record<string, unknown> }) => {
      await fetchJson(`/api/tasks/${args.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args.patch),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { taskId: string; body: Record<string, unknown> }) => {
      await fetchJson(`/api/tasks/${payload.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      });
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  function openAdd(status: TaskStatus) {
    setAddDefaultStatus(status);
    setAddOpen(true);
  }

  function openDetail(taskId: string) {
    setSelectedId(taskId);
    setDetailOpen(true);
  }

  function onMove(ev: KanbanMoveEvent) {
    if (mode !== "admin") return;

    const { activeContainer, activeIndex, overContainer, overIndex, event } = ev;
    const activeId = String(event.active.id);
    const sourceStatus = activeContainer as TaskStatus;
    const destStatus = overContainer as TaskStatus;

    if (!sourceStatus || !destStatus) return;

    const sourceList = [...grouped[sourceStatus]];
    const destList = sourceStatus === destStatus ? sourceList : [...grouped[destStatus]];

    if (sourceStatus === destStatus) {
      const moved = arrayMove(sourceList, activeIndex, overIndex);
      const orderedIds = moved.map((t) => t.id);

      qc.setQueryData<TasksResponse>(["tasks", projectId], (prev) => {
        if (!prev) return prev;
        const nextTasks = prev.tasks.map((t) => {
          const idx = orderedIds.indexOf(t.id);
          if (idx === -1) return t;
          return { ...t, status: destStatus, order: idx };
        });
        return { ...prev, tasks: nextTasks };
      });

      reorderMutation.mutate({
        taskId: activeId,
        body: { status: destStatus, orderedIdsInStatus: orderedIds },
      });
      return;
    }

    const [removed] = sourceList.splice(activeIndex, 1);
    destList.splice(Math.max(0, overIndex), 0, { ...removed, status: destStatus });

    const nextSource = setOrders(sourceList);
    const nextDest = setOrders(destList);

    qc.setQueryData<TasksResponse>(["tasks", projectId], (prev) => {
      if (!prev) return prev;
      const nextTasks = prev.tasks.map((t) => {
        const s = nextSource.find((x) => x.id === t.id);
        if (s) return { ...t, status: sourceStatus, order: s.order };
        const d = nextDest.find((x) => x.id === t.id);
        if (d) return { ...t, status: destStatus, order: d.order };
        return t;
      });
      return { ...prev, tasks: nextTasks };
    });

    reorderMutation.mutate({
      taskId: activeId,
      body: {
        reorder: {
          source: { status: sourceStatus, ids: nextSource.map((t) => t.id) },
          dest: { status: destStatus, ids: nextDest.map((t) => t.id) },
        },
      },
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((c) => (
          <div key={c.status} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <p className="font-ui text-sm text-destructive">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const board = (
    <Kanban
      value={grouped}
      onValueChange={() => {}}
      getItemValue={(item) => item.id}
      onMove={onMove}
    >
      <ReuiKanbanBoard className="grid grid-cols-1 gap-4 lg:grid-cols-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = grouped[col.status] ?? [];
          const meta = COLUMNS_META[col.status];
          return (
            <KanbanColumn key={col.status} value={col.status} disabled={mode !== "admin"}>
              <Frame spacing="sm" className="h-full">
                <FrameHeader className="flex flex-row items-center gap-2">
                  <div className={cn("size-2 rounded-full", meta.color)} />
                  <FrameTitle className="capitalize">{meta.title}</FrameTitle>
                  <Badge variant="outline" size="sm" className="ml-auto">
                    {colTasks.length}
                  </Badge>
                </FrameHeader>
                <KanbanColumnContent
                  value={col.status}
                  className="flex flex-col gap-2 p-1 min-h-[100px]"
                >
                  {colTasks.map((t) => (
                    <KanbanItem key={t.id} value={t.id} disabled={mode !== "admin"}>
                      <TaskCard
                        task={t}
                        assignee={t.assigneeId ? assigneeMap.get(t.assigneeId) : undefined}
                        mode={mode}
                        onOpen={() => openDetail(t.id)}
                        onDelete={mode === "admin" ? () => deleteTask.mutate(t.id) : undefined}
                      />
                    </KanbanItem>
                  ))}
                </KanbanColumnContent>
                {mode === "admin" && (
                  <FrameFooter>
                    <button
                      type="button"
                      onClick={() => openAdd(col.status)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                      <Plus className="size-4" />
                      Add task
                    </button>
                  </FrameFooter>
                )}
              </Frame>
            </KanbanColumn>
          );
        })}
      </ReuiKanbanBoard>
      <KanbanOverlay className="bg-muted/10 rounded-md border-2 border-dashed" />
    </Kanban>
  );

  return (
    <div className="space-y-4">
      {board}

      <AddTaskModal
        open={addOpen}
        onOpenChange={setAddOpen}
        assignees={assignees}
        defaultStatus={addDefaultStatus}
        onSubmit={(values) => createTask.mutateAsync(values)}
      />

      <TaskDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        task={selectedTask}
        assignees={assignees}
        mode={mode}
        onSave={async (patch) => {
          if (!selectedTask) return;
          await saveTask.mutateAsync({ taskId: selectedTask.id, patch });
        }}
      />
    </div>
  );
}
