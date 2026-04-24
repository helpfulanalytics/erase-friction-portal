"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TimerWidget } from "@/components/time/TimerWidget";
import { TimeEntryRow } from "@/components/time/TimeEntryRow";
import type { TimeEntry, WithId } from "@/types/models";

type Me = { uid: string; email: string; name: string };
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

export default function DashboardTimeClient() {
  const qc = useQueryClient();
  const today = React.useMemo(() => new Date(), []);
  const from = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
  const to = ymd(today);

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchJson<Me>("/api/me"),
  });

  const projectsQ = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/projects"),
    enabled: meQ.isSuccess,
  });

  const timeQ = useQuery({
    queryKey: ["my-time", { from, to }],
    queryFn: () => fetchJson<{ entries: Entry[] }>(`/api/time?${new URLSearchParams({ from, to }).toString()}`),
    enabled: meQ.isSuccess,
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
      await qc.invalidateQueries({ queryKey: ["my-time"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson(`/api/time/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      toast.success("Entry deleted.");
      await qc.invalidateQueries({ queryKey: ["my-time"] });
    },
  });

  const me = meQ.data;
  const projects = projectsQ.data?.projects ?? [];
  const entries = timeQ.data?.entries ?? [];
  const totalMins = entries.reduce((sum, e) => sum + (Number(e.duration ?? 0) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headingAlt text-2xl font-bold text-ink">My time</h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Track hours efficiently and attach GitHub work when helpful.
          </p>
        </div>

        {meQ.isLoading || projectsQ.isLoading ? (
          <Skeleton className="h-10 w-[520px]" />
        ) : me && projects.length ? (
          <TimerWidget userId={me.uid} projects={projects} className="w-full md:w-auto" />
        ) : null}
      </div>

      {meQ.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(meQ.error as Error).message}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Last 7 days
          </div>
          <div className="font-ui text-sm font-semibold text-ink">
            {(totalMins / 60).toFixed(1)}h
          </div>
        </div>
      </div>

      {projectsQ.isLoading || timeQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
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
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 font-ui text-sm text-muted-foreground">
                      No entries yet. Start the timer or log time manually.
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <TimeEntryRow
                      key={e.id}
                      entry={e}
                      users={me ? [{ id: me.uid, name: me.name, email: me.email }] : []}
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
      )}
    </div>
  );
}

