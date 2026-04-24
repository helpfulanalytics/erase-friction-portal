"use client";

import * as React from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/types/models";

type User = { id: string; name?: string; email?: string };
type Project = { id: string; name?: string };
type Entry = Pick<TimeEntry, "userId" | "projectId" | "duration" | "date">;

function hours(mins: number) {
  return mins / 60;
}

export function TimesheetGrid({
  weekStart,
  onWeekChange,
  users,
  projects,
  entries,
  projectFilter,
  onProjectFilterChange,
  userFilter,
  onUserFilterChange,
  onExport,
}: {
  weekStart: Date;
  onWeekChange: (d: Date) => void;
  users: User[];
  projects: Project[];
  entries: Entry[];
  projectFilter: string;
  onProjectFilterChange: (v: string) => void;
  userFilter: string;
  onUserFilterChange: (v: string) => void;
  onExport: () => void;
}) {
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayKeys = days.map((d) => format(d, "yyyy-MM-dd"));

  const byUserDay = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (projectFilter !== "ALL" && e.projectId !== projectFilter) continue;
      if (userFilter !== "ALL" && e.userId !== userFilter) continue;
      const key = `${e.userId}:${e.date}`;
      map.set(key, (map.get(key) ?? 0) + (Number(e.duration ?? 0) || 0));
    }
    return map;
  }, [entries, projectFilter, userFilter]);

  const rowTotal = (uid: string) =>
    dayKeys.reduce((sum, k) => sum + (byUserDay.get(`${uid}:${k}`) ?? 0), 0);
  const colTotal = (k: string) =>
    users.reduce((sum, u) => sum + (byUserDay.get(`${u.id}:${k}`) ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-subtle"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            {format(weekStart, "dd MMM")} – {format(addDays(weekStart, 6), "dd MMM")}
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-subtle"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
          >
            <option value="ALL">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? "Project"}
              </option>
            ))}
          </select>
          <select
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
          >
            <option value="ALL">All members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email ?? "Member"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-border bg-subtle">
              <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">
                Member
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="px-3 py-2 text-left font-ui text-xs font-semibold text-muted-foreground"
                >
                  {format(d, "EEE dd")}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-ui text-xs font-semibold text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              if (userFilter !== "ALL" && u.id !== userFilter) return null;
              const totalMins = rowTotal(u.id);
              return (
                <tr key={u.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-headingAlt text-sm font-semibold text-ink">
                    {u.name ?? u.email ?? "Member"}
                  </td>
                  {dayKeys.map((k) => {
                    const mins = byUserDay.get(`${u.id}:${k}`) ?? 0;
                    const h = hours(mins);
                    const isOver = h > 8;
                    const isTodayCell = isSameDay(new Date(k), new Date());
                    return (
                      <td
                        key={k}
                        className={cn(
                          "px-3 py-3 font-ui text-sm",
                          isOver && "bg-amber-50",
                          isTodayCell && "ring-1 ring-brand/40"
                        )}
                        title={`${mins} mins`}
                      >
                        {mins ? h.toFixed(1) : "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-ui text-sm font-semibold text-ink">
                    {totalMins ? hours(totalMins).toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}

            <tr className="border-t border-border bg-subtle">
              <td className="px-4 py-3 font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Total
              </td>
              {dayKeys.map((k) => {
                const mins = colTotal(k);
                return (
                  <td key={k} className="px-3 py-3 font-ui text-sm text-ink">
                    {mins ? hours(mins).toFixed(1) : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-right font-ui text-sm font-semibold text-ink">
                {(() => {
                  const mins = dayKeys.reduce((sum, k) => sum + colTotal(k), 0);
                  return mins ? hours(mins).toFixed(1) : "—";
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

