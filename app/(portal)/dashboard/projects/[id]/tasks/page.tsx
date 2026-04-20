import type { Metadata } from "next";
import { TasksBoard } from "@/components/tasks/TasksBoard";

export const metadata: Metadata = { title: "Tasks — Erase Friction" };

export default async function ClientTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-headingAlt text-2xl font-bold text-ink">Tasks</h1>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Track tasks for this project.
        </p>
      </div>

      <TasksBoard projectId={id} mode="client" />
    </div>
  );
}

