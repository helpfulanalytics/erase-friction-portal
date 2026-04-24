"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TimesheetGrid } from "@/components/time/TimesheetGrid";
import { TimeEntryRow } from "@/components/time/TimeEntryRow";
import type { TimeEntry, WithId } from "@/types/models";

type User = { id: string; name?: string; email?: string };
type Project = { id: string; name?: string };
type Entry = WithId<TimeEntry>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function AdminTimeClient() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const from = ymd(weekStart);
  const to = ymd(addDays(weekStart, 6));

  const [projectId, setProjectId] = React.useState<string>("ALL");
  const [userId, setUserId] = React.useState<string>("ALL");

  const teamQ = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => fetchJson<{ users: User[]; projects: Project[] }>("/api/admin/team"),
  });

  const activeQ = useQuery({
    queryKey: ["time-active"],
    queryFn: () => fetchJson<{ timers: Array<{ id: string; userId: string; projectId: string; description?: string; updatedAt?: unknown }> }>(
      "/api/time/active"
    ),
    refetchInterval: 15_000,
    enabled: teamQ.isSuccess,
  });

  const timeQ = useQuery({
    queryKey: ["time", { from, to, projectId, userId }],
    queryFn: () => {
      const qs = new URLSearchParams({ from, to });
      if (projectId !== "ALL") qs.set("projectId", projectId);
      if (userId !== "ALL") qs.set("userId", userId);
      return fetchJson<{ entries: Entry[] }>(`/api/time?${qs.toString()}`);
    },
    enabled: teamQ.isSuccess,
  });

  const updateEntry = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Entry> }) => {
      await fetchJson(`/api/time/${args.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args.patch),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["time"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson(`/api/time/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      toast.success("Entry deleted.");
      await qc.invalidateQueries({ queryKey: ["time"] });
    },
  });

  const users = teamQ.data?.users ?? [];
  const projects = teamQ.data?.projects ?? [];
  const entries = timeQ.data?.entries ?? [];
  const activeTimers = activeQ.data?.timers ?? [];

  const userLabel = (uid: string) =>
    users.find((u) => u.id === uid)?.name ??
    users.find((u) => u.id === uid)?.email ??
    uid;
  const projectLabel = (pid: string) =>
    projects.find((p) => p.id === pid)?.name ??
    pid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headingAlt text-2xl font-bold text-ink">Time tracking</h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Weekly timesheet across all projects.
          </p>
        </div>
      </div>

      {teamQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : teamQ.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(teamQ.error as Error).message}</p>
        </div>
      ) : (
        <>
          {activeTimers.length ? (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Active timers
                </div>
                <div className="font-ui text-xs text-muted-foreground">
                  Refreshes every 15 seconds
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTimers.map((t) => (
                  <div
                    key={t.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-subtle px-3 py-1"
                    title={t.description ?? ""}
                  >
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                    <span className="font-ui text-xs font-semibold text-ink">
                      {userLabel(t.userId)}
                    </span>
                    <span className="font-ui text-xs text-muted-foreground">•</span>
                    <span className="font-ui text-xs text-muted-foreground">
                      {projectLabel(t.projectId)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <TimesheetGrid
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            users={users}
            projects={projects}
            entries={entries}
            projectFilter={projectId}
            onProjectFilterChange={setProjectId}
            userFilter={userId}
            onUserFilterChange={setUserId}
            onExport={() => {
              const qs = new URLSearchParams({ from, to });
              if (projectId !== "ALL") qs.set("projectId", projectId);
              if (userId !== "ALL") qs.set("userId", userId);
              window.location.href = `/api/time/export?${qs.toString()}`;
            }}
          />

          <div className="rounded-xl border border-border bg-surface shadow-card">
            <div className="border-b border-border px-4 py-3">
              <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Entries
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-border bg-subtle">
                    <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">
                      Member
                    </th>
                    <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">
                      Project
                    </th>
                    <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right font-ui text-xs font-semibold text-muted-foreground">
                      Duration
                    </th>
                    <th className="px-4 py-2 text-right font-ui text-xs font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeQ.isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 font-ui text-sm text-muted-foreground">
                        No entries for this week.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <TimeEntryRow
                        key={e.id}
                        entry={e}
                        users={users}
                        projects={projects}
                        onUpdate={(patch) => updateEntry.mutateAsync({ id: e.id, patch })}
                        onDelete={() => deleteEntry.mutateAsync(e.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

