export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: unknown;
  progress?: number;
  attachments?: string[];
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: number | null; // ms
  order: number;
  createdAt?: number;
}

export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

export const KANBAN_COLUMNS: Array<{ status: TaskStatus; title: string }> = [
  { status: "TODO", title: "Todo" },
  { status: "IN_PROGRESS", title: "In Progress" },
  { status: "IN_REVIEW", title: "In Review" },
  { status: "DONE", title: "Done" },
];

