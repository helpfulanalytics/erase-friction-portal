"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { MilestoneProgressBar } from "@/components/dashboard/MilestoneProgressBar";
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { DocRow } from "@/components/dashboard/DocRow";

type Summary = {
  user: { name?: string; email?: string } | null;
  today: string;
  stats: {
    milestones: { completed: number; total: number };
    openTasks: { count: number; dueThisWeek: number };
    documents: { count: number; pendingApproval: number };
    unreadMessages: number;
  };
};

type Onboarding = {
  items: Array<{ id: string; title: string; description?: string; completed: boolean }>;
  completedCount: number;
  totalCount: number;
  percent: number;
};

type ProjectProgress = {
  projects: Array<{
    projectId: string;
    status: "ON_TRACK" | "AT_RISK" | "BLOCKED";
    milestones: Array<{ id: string; title: string; percentComplete: number }>;
  }>;
};

type RecentDocs = {
  documents: Array<{
    id: string;
    title?: string;
    type?: string;
    status?: string;
    updatedAt?: number;
  }>;
};

type Activity = {
  events: Array<{
    id: string;
    actorName?: string;
    description?: string;
    type?: string;
    createdAt?: number;
  }>;
};

type OutstandingInvoices = {
  invoices: Array<{
    id: string;
    invoiceNumber?: string;
    amount?: number;
    dueDate?: number;
    status?: string;
  }>;
};

function ngn(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}

function safeDate(ms?: number) {
  if (!ms) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusBadge(status: ProjectProgress["projects"][number]["status"]) {
  if (status === "BLOCKED") return { label: "Blocked", cls: "border-red-300 bg-red-50 text-red-800" };
  if (status === "AT_RISK") return { label: "At Risk", cls: "border-orange-300 bg-orange-50 text-orange-800" };
  return { label: "On Track", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function DashboardClient() {
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => fetchJson<Summary>("/api/dashboard/summary"),
  });
  const onboarding = useQuery({
    queryKey: ["dashboard", "onboarding"],
    queryFn: () => fetchJson<Onboarding>("/api/dashboard/onboarding"),
  });
  const progress = useQuery({
    queryKey: ["dashboard", "project-progress"],
    queryFn: () => fetchJson<ProjectProgress>("/api/dashboard/project-progress"),
  });
  const recentDocs = useQuery({
    queryKey: ["dashboard", "recent-documents"],
    queryFn: () => fetchJson<RecentDocs>("/api/dashboard/recent-documents"),
  });
  const activity = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => fetchJson<Activity>("/api/dashboard/activity"),
  });
  const invoices = useQuery({
    queryKey: ["dashboard", "outstanding-invoices"],
    queryFn: () => fetchJson<OutstandingInvoices>("/api/dashboard/outstanding-invoices"),
  });

  const name =
    summary.data?.user?.name ||
    summary.data?.user?.email?.split("@")[0] ||
    "there";

  const today = summary.data?.today ? new Date(summary.data.today) : new Date();

  const firstOutstanding = invoices.data?.invoices?.[0];
  const showInvoiceBanner = Boolean(firstOutstanding);

  const onboardingIncomplete =
    (onboarding.data?.totalCount ?? 0) > 0 && (onboarding.data?.percent ?? 0) < 100;

  // Stats: prefer live computed data if present; otherwise show zeros.
  const milestoneCompleted = progress.data
    ? progress.data.projects.flatMap((p) => p.milestones).filter((m) => m.percentComplete >= 100).length
    : summary.data?.stats.milestones.completed ?? 0;

  const milestoneTotal = progress.data
    ? progress.data.projects.flatMap((p) => p.milestones).length
    : summary.data?.stats.milestones.total ?? 0;

  const documentsCount = summary.data?.stats.documents.count ?? (recentDocs.data?.documents.length ?? 0);

  const pendingApproval = summary.data?.stats.documents.pendingApproval ?? 0;
  const unreadMessages = summary.data?.stats.unreadMessages ?? 0;

  const openTasks = summary.data?.stats.openTasks.count ?? 0;
  const dueThisWeek = summary.data?.stats.openTasks.dueThisWeek ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. Welcome hero */}
      <section className="relative overflow-hidden rounded-2xl bg-brand px-6 py-7">
        {/* subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.6) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
              {format(today, "EEEE, dd MMMM yyyy")}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Good morning, {name}
            </h1>
            <p className="mt-1.5 font-headingAlt text-[15px] text-ink/60">
              Here&apos;s what&apos;s happening across your projects.
            </p>
          </div>
          {/* Quick stat pills */}
          <div className="flex flex-wrap gap-2 pt-3 sm:pt-0">
            {[
              { label: "Open tasks", value: openTasks },
              { label: "Unread", value: unreadMessages },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-xl bg-black/[0.08] px-4 py-2 text-center"
              >
                <span className="font-heading text-xl font-extrabold text-ink leading-none">
                  {value}
                </span>
                <span className="mt-0.5 font-ui text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Onboarding checklist */}
      {onboarding.isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
          </div>
        </div>
      ) : onboardingIncomplete && onboarding.data ? (
        <OnboardingChecklist
          percent={onboarding.data.percent}
          completedCount={onboarding.data.completedCount}
          totalCount={onboarding.data.totalCount}
          items={onboarding.data.items}
        />
      ) : null}

      {/* 3. Stat cards row */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Milestones"
          value={`${milestoneCompleted}/${milestoneTotal}`}
          sublabel="Complete"
        >
          <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width:
                  milestoneTotal === 0
                    ? "0%"
                    : `${Math.round((milestoneCompleted / milestoneTotal) * 100)}%`,
              }}
            />
          </div>
        </StatCard>

        <StatCard
          title="Open tasks"
          value={openTasks}
          sublabel="Assigned to you"
          rightMeta={dueThisWeek > 0 ? `${dueThisWeek} due this week` : undefined}
          tone={dueThisWeek > 0 ? "warning" : "default"}
        />

        <StatCard
          title="Documents"
          value={documentsCount}
          sublabel={
            pendingApproval > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-brand" />
                {pendingApproval} pending approval
              </span>
            ) : (
              "Up to date"
            )
          }
        />

        <StatCard title="Unread messages" value={unreadMessages} sublabel="Inbox" />
      </section>

      {/* 7. Outstanding invoice banner */}
      {showInvoiceBanner ? (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Outstanding invoice
              </div>
              <div className="mt-1 font-headingAlt text-lg font-bold text-ink">
                {firstOutstanding?.invoiceNumber ?? "Invoice"}
              </div>
              <div className="mt-1 font-ui text-sm text-muted-foreground">
                {typeof firstOutstanding?.amount === "number" ? ngn(firstOutstanding.amount) : "—"}{" "}
                • Due{" "}
                {safeDate(firstOutstanding?.dueDate)
                  ? format(safeDate(firstOutstanding?.dueDate)!, "dd MMM yyyy")
                  : "—"}
              </div>
            </div>
            <Link
              href="/invoices"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              View invoice
            </Link>
          </div>
        </section>
      ) : null}

      {/* 4. Project progress card */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headingAlt text-lg font-bold text-ink">Project progress</h2>
            <p className="mt-1 font-ui text-sm text-muted-foreground">
              Progress by milestone across your projects.
            </p>
          </div>
          {progress.data?.projects?.[0] ? (
            <span className={`rounded-full border px-2 py-1 font-ui text-xs font-semibold ${statusBadge(progress.data.projects[0].status).cls}`}>
              {statusBadge(progress.data.projects[0].status).label}
            </span>
          ) : null}
        </div>

        {progress.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-11/12" />
          </div>
        ) : progress.data?.projects?.length ? (
          <div className="space-y-6">
            {progress.data.projects.map((p) => (
              <div key={p.projectId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Project {p.projectId.slice(0, 6)}
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 font-ui text-[11px] font-semibold ${statusBadge(p.status).cls}`}>
                    {statusBadge(p.status).label}
                  </span>
                </div>
                <div className="space-y-3">
                  {p.milestones.map((m) => (
                    <MilestoneProgressBar key={m.id} label={m.title} percent={m.percentComplete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-ui text-sm text-muted-foreground">No milestones yet.</div>
        )}
      </section>

      {/* 5. Recent documents card */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-headingAlt text-lg font-bold text-ink">Recent documents</h2>
            <p className="mt-1 font-ui text-sm text-muted-foreground">
              The latest client-visible docs from your projects.
            </p>
          </div>
          <Link href="/docs" className="font-ui text-sm font-semibold text-ink hover:underline">
            <span className="text-brand">View all →</span>
          </Link>
        </div>

        {recentDocs.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentDocs.data?.documents?.length ? (
          <div className="divide-y divide-border">
            {recentDocs.data.documents.map((d) => {
              const updated = safeDate(d.updatedAt);
              return (
                <DocRow
                  key={d.id}
                  title={d.title ?? "Document"}
                  type={d.type ?? "DOC"}
                  status={d.status ?? "—"}
                  updated={updated ? format(updated, "dd MMM yyyy") : "—"}
                  href="/docs"
                />
              );
            })}
          </div>
        ) : (
          <div className="font-ui text-sm text-muted-foreground">No documents yet.</div>
        )}
      </section>

      {/* 6. Activity feed card */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="mb-4">
          <h2 className="font-headingAlt text-lg font-bold text-ink">Activity</h2>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Updates across your projects.
          </p>
        </div>

        {activity.isLoading ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-9/12" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ) : activity.data?.events?.length ? (
          <div className="space-y-5">
            {activity.data.events.map((e) => {
              const created = safeDate(e.createdAt);
              return (
                <ActivityFeedItem
                  key={e.id}
                  name={e.actorName ?? "Erase Friction"}
                  description={e.description ?? (e.type ? String(e.type).toLowerCase().replaceAll("_", " ") : "updated")}
                  when={created ? formatDistanceToNowStrict(created, { addSuffix: true }) : "just now"}
                />
              );
            })}
          </div>
        ) : (
          <div className="font-ui text-sm text-muted-foreground">No activity yet.</div>
        )}
      </section>
    </div>
  );
}

