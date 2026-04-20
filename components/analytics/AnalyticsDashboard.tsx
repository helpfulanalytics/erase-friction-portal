"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { pdf } from "@react-pdf/renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AnalyticsStatCard } from "@/components/analytics/AnalyticsStatCard";
import { ChartCard } from "@/components/analytics/chart-card";
import { HoursBarChart } from "@/components/analytics/charts/HoursBarChart";
import { MilestoneDonut } from "@/components/analytics/charts/MilestoneDonut";
import { InvoiceDonut } from "@/components/analytics/charts/InvoiceDonut";
import { ApprovalBarChart } from "@/components/analytics/charts/ApprovalBarChart";
import { TaskStackedBar } from "@/components/analytics/charts/TaskStackedBar";
import { ActivityAreaChart } from "@/components/analytics/charts/ActivityAreaChart";
import { AnalyticsReportPdf } from "@/components/analytics/AnalyticsReportPdf";

type AnalyticsResponse = {
  controls: { from: string; to: string; projectId: string | null };
  stats: {
    totalMinutesAllTime: number;
    activeProjectsCount: number;
    pendingApprovalsCount: number;
    outstandingInvoicesTotal: number;
  };
  charts: {
    hoursPerProject: Array<{ projectId: string; projectName: string; hours: number }>;
    milestoneCompletion: { done: number; inProgress: number; pending: number; percentComplete: number };
    invoiceStatus: { paid: number; pending: number; overdue: number; total: number; outstandingTotal: number };
    approvalTurnaround: Array<{ projectId: string; projectName: string; avgDays: number }>;
    taskStatus: Array<{ projectId: string; projectName: string; todo: number; inProgress: number; inReview: number; done: number }>;
    activityOverTime: Array<{ date: string; count: number }>;
  };
};

type TeamProjects = { projects: Array<{ id: string; name?: string; status?: string }> };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function ngn(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function hoursFromMinutes(mins: number) {
  return (mins / 60).toFixed(1);
}

type RangePreset = "7" | "30" | "90" | "custom";

export function AnalyticsDashboard() {
  const [preset, setPreset] = React.useState<RangePreset>("30");
  const [customFrom, setCustomFrom] = React.useState<string>(ymd(subDays(new Date(), 29)));
  const [customTo, setCustomTo] = React.useState<string>(ymd(new Date()));
  const [projectId, setProjectId] = React.useState<string>("all");
  const [exporting, setExporting] = React.useState(false);

  const teamQ = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => fetchJson<TeamProjects>("/api/admin/team"),
  });

  const { from, to } = React.useMemo(() => {
    const now = new Date();
    if (preset === "7") return { from: ymd(subDays(now, 6)), to: ymd(now) };
    if (preset === "90") return { from: ymd(subDays(now, 89)), to: ymd(now) };
    if (preset === "custom") return { from: customFrom, to: customTo };
    return { from: ymd(subDays(now, 29)), to: ymd(now) };
  }, [preset, customFrom, customTo]);

  const q = useQuery({
    queryKey: ["admin", "analytics-v2", from, to, projectId],
    queryFn: () =>
      fetchJson<AnalyticsResponse>(
        `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
          projectId !== "all" ? `&projectId=${encodeURIComponent(projectId)}` : ""
        }`
      ),
  });

  async function exportPdf() {
    if (!q.data) return;
    setExporting(true);
    try {
      const doc = <AnalyticsReportPdf data={q.data} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_${from}_${to}${projectId !== "all" ? `_${projectId}` : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const projects = (teamQ.data?.projects ?? [])
    .map((p) => ({ id: p.id, name: p.name ?? p.id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink">
            Analytics
          </h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Admin insights across time, docs, tasks, invoices, and activity.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-xl border border-[#e4e4e7] bg-white p-1 shadow-sm">
            {[
              { id: "7", label: "Last 7 days" },
              { id: "30", label: "30 days" },
              { id: "90", label: "90 days" },
              { id: "custom", label: "Custom" },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPreset(o.id as RangePreset)}
                className={cn(
                  "h-9 rounded-lg px-3 font-ui text-xs font-semibold transition-colors",
                  preset === o.id ? "bg-[#B9FF66] text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 rounded-xl border border-[#e4e4e7] bg-white px-3 font-ui text-sm font-semibold text-zinc-900 shadow-sm"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={exportPdf}
            disabled={!q.data || exporting}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white px-4 font-ui text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export report"}
          </button>
        </div>
      </div>

      {preset === "custom" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
          <div className="rounded-[12px] border border-[#e4e4e7] bg-white p-3 shadow-sm">
            <label className="block font-ui text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
              From
            </label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 font-ui text-sm text-zinc-900"
            />
          </div>
          <div className="rounded-[12px] border border-[#e4e4e7] bg-white p-3 shadow-sm">
            <label className="block font-ui text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
              To
            </label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 font-ui text-sm text-zinc-900"
            />
          </div>
        </div>
      ) : null}

      {q.isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[12px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[330px] rounded-[12px]" />
            ))}
          </div>
        </>
      ) : q.error ? (
        <div className="rounded-[12px] border border-[#e4e4e7] bg-white p-6 font-ui text-sm text-destructive shadow-sm">
          {(q.error as Error).message}
        </div>
      ) : (
        (() => {
          const d = q.data!;
          return (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsStatCard
                  title="Total hours logged (all time)"
                  value={`${hoursFromMinutes(d.stats.totalMinutesAllTime)}h`}
                  sublabel={`${Math.round(d.stats.totalMinutesAllTime)} minutes`}
                  trendPct={null}
                />
                <AnalyticsStatCard
                  title="Active projects"
                  value={d.stats.activeProjectsCount}
                  sublabel={`Range ${from} → ${to}`}
                  trendPct={null}
                />
                <AnalyticsStatCard
                  title="Pending approvals"
                  value={d.stats.pendingApprovalsCount}
                  sublabel="Documents in review"
                  trendPct={null}
                />
                <AnalyticsStatCard
                  title="Outstanding invoices total"
                  value={ngn(d.stats.outstandingInvoicesTotal)}
                  sublabel={`${d.charts.invoiceStatus.pending + d.charts.invoiceStatus.overdue} unpaid`}
                  trendPct={null}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard title="Hours logged per project">
                  <HoursBarChart data={d.charts.hoursPerProject} />
                </ChartCard>

                <ChartCard title="Milestone completion rate">
                  <MilestoneDonut
                    done={d.charts.milestoneCompletion.done}
                    inProgress={d.charts.milestoneCompletion.inProgress}
                    pending={d.charts.milestoneCompletion.pending}
                    percentComplete={d.charts.milestoneCompletion.percentComplete}
                  />
                </ChartCard>

                <ChartCard title="Invoice status breakdown">
                  <InvoiceDonut
                    paid={d.charts.invoiceStatus.paid}
                    pending={d.charts.invoiceStatus.pending}
                    overdue={d.charts.invoiceStatus.overdue}
                    total={d.charts.invoiceStatus.total}
                  />
                </ChartCard>

                <ChartCard title="Doc approval turnaround">
                  <ApprovalBarChart data={d.charts.approvalTurnaround} />
                </ChartCard>

                <ChartCard title="Task status distribution">
                  <TaskStackedBar data={d.charts.taskStatus} />
                </ChartCard>

                <ChartCard title="Activity over time">
                  <ActivityAreaChart data={d.charts.activityOverTime} />
                </ChartCard>
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}

