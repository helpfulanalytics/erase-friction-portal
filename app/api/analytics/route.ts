export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { parseDateYYYYMMDD } from "@/lib/server/time-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

type AnalyticsResponse = {
  controls: {
    from: string;
    to: string;
    projectId: string | null;
  };
  projects: Array<{ id: string; name: string; status?: string }>;
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
    taskStatus: Array<{
      projectId: string;
      projectName: string;
      todo: number;
      inProgress: number;
      inReview: number;
      done: number;
    }>;
    activityOverTime: Array<{ date: string; count: number }>;
  };
};

function normalizeTaskStatus(v: unknown): "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" {
  const s = String(v ?? "").toUpperCase();
  if (s === "DONE") return "DONE";
  if (s === "IN_REVIEW") return "IN_REVIEW";
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  return "TODO";
}

function normalizeInvoiceStatus(v: unknown): "PAID" | "PENDING" | "OVERDUE" {
  const s = String(v ?? "").toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "OVERDUE") return "OVERDUE";
  return "PENDING";
}

function normalizeDocStatus(v: unknown): "DRAFT" | "REVIEW" | "APPROVED" {
  const s = String(v ?? "").toUpperCase();
  if (s === "APPROVED") return "APPROVED";
  if (s === "REVIEW") return "REVIEW";
  return "DRAFT";
}

function normalizeMilestoneStatus(v: unknown): "DONE" | "IN_PROGRESS" | "PENDING" {
  const s = String(v ?? "").toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return "DONE";
  if (s === "IN_PROGRESS" || s === "ACTIVE") return "IN_PROGRESS";
  return "PENDING";
}

async function computeAnalytics(args: {
  from: string;
  to: string;
  projectId: string | null;
}): Promise<AnalyticsResponse> {
  const { from, to, projectId } = args;

  const projectsSnap = await adminDb.collection("projects").get();
  const allProjects = projectsSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: String(data.name ?? "Untitled project"),
      status: String(data.status ?? "ACTIVE"),
    };
  });

  const allowedProjects = projectId
    ? allProjects.filter((p) => p.id === projectId)
    : allProjects;
  const allowedProjectIds = new Set(allowedProjects.map((p) => p.id));
  const projectNameById = new Map(allowedProjects.map((p) => [p.id, p.name] as const));

  // ---- Time (all time + range for chart) ----
  let timeAllQ: FirebaseFirestore.Query = adminDb.collection("timeEntries");
  if (projectId) timeAllQ = timeAllQ.where("projectId", "==", projectId);
  const timeAllSnap = await timeAllQ.get();
  let totalMinutesAllTime = 0;
  for (const d of timeAllSnap.docs) {
    const dur = (d.data() as Record<string, unknown>).duration;
    totalMinutesAllTime += typeof dur === "number" ? dur : 0;
  }

  let timeRangeQ: FirebaseFirestore.Query = adminDb.collection("timeEntries");
  if (projectId) timeRangeQ = timeRangeQ.where("projectId", "==", projectId);
  timeRangeQ = timeRangeQ.where("date", ">=", from).where("date", "<=", to);
  const timeRangeSnap = await timeRangeQ.get();
  const minutesByProject = new Map<string, number>();
  for (const d of timeRangeSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid) continue;
    if (projectId && pid !== projectId) continue;
    if (!allowedProjectIds.has(pid)) continue;
    const dur = typeof data.duration === "number" ? data.duration : 0;
    minutesByProject.set(pid, (minutesByProject.get(pid) ?? 0) + dur);
  }

  const hoursPerProject = Array.from(minutesByProject.entries())
    .map(([pid, mins]) => ({
      projectId: pid,
      projectName: projectNameById.get(pid) ?? pid,
      hours: Math.round((mins / 60) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);

  // ---- Active projects ----
  const activeProjectsCount = allowedProjects.filter((p) =>
    String(p.status ?? "").toUpperCase() === "ACTIVE"
  ).length;

  // ---- Docs: pending approvals + approval turnaround (activityEvents based) ----
  let docsQ: FirebaseFirestore.Query = adminDb.collection("documents");
  if (projectId) docsQ = docsQ.where("projectId", "==", projectId);
  // Use updatedAt for range filtering; documents missing updatedAt will be excluded from range.
  docsQ = docsQ
    .where("updatedAt", ">=", Timestamp.fromDate(startOfDay(new Date(from))))
    .where("updatedAt", "<=", Timestamp.fromDate(addDays(startOfDay(new Date(to)), 1)));
  const docsSnap = await docsQ.get();
  let pendingApprovalsCount = 0;
  for (const d of docsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid) continue;
    if (!allowedProjectIds.has(pid)) continue;
    const status = normalizeDocStatus(data.status);
    if (status === "REVIEW") pendingApprovalsCount++;
  }

  // ActivityEvents used to compute REVIEW -> APPROVED turnaround.
  // We take DOC_REQUEST_APPROVAL as "review start" and DOC_APPROVED as "approved".
  let eventsQ: FirebaseFirestore.Query = adminDb.collection("activityEvents");
  if (projectId) eventsQ = eventsQ.where("projectId", "==", projectId);
  eventsQ = eventsQ
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay(new Date(from))))
    .where("createdAt", "<=", Timestamp.fromDate(addDays(startOfDay(new Date(to)), 1)));
  const eventsSnap = await eventsQ.get();

  const requestAtByDocId = new Map<string, number>();
  const approvedAtByDocId = new Map<string, number>();
  const docProjectByDocId = new Map<string, string>();

  for (const d of eventsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid || !allowedProjectIds.has(pid)) continue;

    const type = String(data.type ?? "");
    const docId = String(data.documentId ?? "");
    const createdAtMs = (data.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    if (!docId || !createdAtMs) continue;

    docProjectByDocId.set(docId, pid);

    if (type === "DOC_REQUEST_APPROVAL" || type === "DOC_APPROVAL_REQUESTED") {
      const prev = requestAtByDocId.get(docId) ?? 0;
      if (!prev || createdAtMs > prev) requestAtByDocId.set(docId, createdAtMs);
    }

    if (type === "DOC_APPROVED") {
      const prev = approvedAtByDocId.get(docId) ?? 0;
      if (!prev || createdAtMs > prev) approvedAtByDocId.set(docId, createdAtMs);
    }
  }

  const turnaroundByProject = new Map<string, { sumDays: number; n: number }>();
  for (const [docId, approvedAt] of approvedAtByDocId.entries()) {
    const requestedAt = requestAtByDocId.get(docId);
    if (!requestedAt) continue;
    const pid = docProjectByDocId.get(docId);
    if (!pid) continue;
    const days = (approvedAt - requestedAt) / (1000 * 60 * 60 * 24);
    const safeDays = clamp(days, 0, 3650);
    const agg = turnaroundByProject.get(pid) ?? { sumDays: 0, n: 0 };
    agg.sumDays += safeDays;
    agg.n += 1;
    turnaroundByProject.set(pid, agg);
  }

  const approvalTurnaround = Array.from(allowedProjectIds)
    .map((pid) => {
      const agg = turnaroundByProject.get(pid);
      const avg = agg && agg.n > 0 ? agg.sumDays / agg.n : 0;
      return {
        projectId: pid,
        projectName: projectNameById.get(pid) ?? pid,
        avgDays: Math.round(avg * 10) / 10,
      };
    })
    .sort((a, b) => b.avgDays - a.avgDays);

  // ---- Invoices (status donut + outstanding total) ----
  let invoicesQ: FirebaseFirestore.Query = adminDb.collection("invoices");
  if (projectId) invoicesQ = invoicesQ.where("projectId", "==", projectId);
  invoicesQ = invoicesQ
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay(new Date(from))))
    .where("createdAt", "<=", Timestamp.fromDate(addDays(startOfDay(new Date(to)), 1)));
  const invoicesSnap = await invoicesQ.get();

  let paid = 0;
  let pending = 0;
  let overdue = 0;
  let total = 0;
  let outstandingInvoicesTotal = 0;

  for (const d of invoicesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid || !allowedProjectIds.has(pid)) continue;
    const status = normalizeInvoiceStatus(data.status);
    const amount = typeof data.amount === "number" ? data.amount : 0;
    total++;
    if (status === "PAID") paid++;
    else if (status === "OVERDUE") { overdue++; outstandingInvoicesTotal += amount; }
    else { pending++; outstandingInvoicesTotal += amount; }
  }

  // ---- Milestones (completion donut) ----
  let milestonesQ: FirebaseFirestore.Query = adminDb.collection("milestones");
  if (projectId) milestonesQ = milestonesQ.where("projectId", "==", projectId);
  // Try to respect date range if milestone has createdAt.
  milestonesQ = milestonesQ
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay(new Date(from))))
    .where("createdAt", "<=", Timestamp.fromDate(addDays(startOfDay(new Date(to)), 1)));
  let milestonesSnap;
  try {
    milestonesSnap = await milestonesQ.get();
  } catch {
    // If createdAt isn't indexed/present, fall back to unfiltered query.
    let fallback: FirebaseFirestore.Query = adminDb.collection("milestones");
    if (projectId) fallback = fallback.where("projectId", "==", projectId);
    milestonesSnap = await fallback.get();
  }

  let mDone = 0;
  let mInProgress = 0;
  let mPending = 0;
  for (const d of milestonesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid || !allowedProjectIds.has(pid)) continue;
    const status = normalizeMilestoneStatus(data.status ?? (data.completed ? "DONE" : "PENDING"));
    if (status === "DONE") mDone++;
    else if (status === "IN_PROGRESS") mInProgress++;
    else mPending++;
  }
  const mTotal = mDone + mInProgress + mPending;
  const percentComplete = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;

  // ---- Tasks (stacked bar) ----
  let tasksQ: FirebaseFirestore.Query = adminDb.collection("tasks");
  if (projectId) tasksQ = tasksQ.where("projectId", "==", projectId);
  tasksQ = tasksQ
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay(new Date(from))))
    .where("createdAt", "<=", Timestamp.fromDate(addDays(startOfDay(new Date(to)), 1)));
  const tasksSnap = await tasksQ.get();

  const taskAggByProject = new Map<
    string,
    { todo: number; inProgress: number; inReview: number; done: number }
  >();
  for (const d of tasksSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid || !allowedProjectIds.has(pid)) continue;
    const status = normalizeTaskStatus(data.status);
    const agg = taskAggByProject.get(pid) ?? { todo: 0, inProgress: 0, inReview: 0, done: 0 };
    if (status === "DONE") agg.done++;
    else if (status === "IN_REVIEW") agg.inReview++;
    else if (status === "IN_PROGRESS") agg.inProgress++;
    else agg.todo++;
    taskAggByProject.set(pid, agg);
  }

  const taskStatus = Array.from(allowedProjectIds)
    .map((pid) => {
      const agg = taskAggByProject.get(pid) ?? { todo: 0, inProgress: 0, inReview: 0, done: 0 };
      return {
        projectId: pid,
        projectName: projectNameById.get(pid) ?? pid,
        ...agg,
      };
    })
    .sort((a, b) => (b.todo + b.inProgress + b.inReview + b.done) - (a.todo + a.inProgress + a.inReview + a.done));

  // ---- Activity over time (daily buckets) ----
  const fromD = startOfDay(new Date(from));
  const toD = startOfDay(new Date(to));
  const days = clamp(Math.round((toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1, 365);

  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) counts.set(ymd(addDays(fromD, i)), 0);
  for (const d of eventsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const pid = String(data.projectId ?? "");
    if (!pid || !allowedProjectIds.has(pid)) continue;
    const createdAtMs = (data.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    if (!createdAtMs) continue;
    const key = ymd(new Date(createdAtMs));
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const activityOverTime = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    controls: { from, to, projectId: projectId ?? null },
    projects: allowedProjects,
    stats: {
      totalMinutesAllTime,
      activeProjectsCount,
      pendingApprovalsCount,
      outstandingInvoicesTotal,
    },
    charts: {
      hoursPerProject,
      milestoneCompletion: {
        done: mDone,
        inProgress: mInProgress,
        pending: mPending,
        percentComplete,
      },
      invoiceStatus: {
        paid,
        pending,
        overdue,
        total,
        outstandingTotal: outstandingInvoicesTotal,
      },
      approvalTurnaround,
      taskStatus,
      activityOverTime,
    },
  };
}

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const url = new URL(request.url);

  const rawFrom = parseDateYYYYMMDD(url.searchParams.get("from"));
  const rawTo = parseDateYYYYMMDD(url.searchParams.get("to"));
  const projectId = (url.searchParams.get("projectId") || "").trim() || null;

  const to = rawTo ?? ymd(new Date());
  const from =
    rawFrom ??
    ymd(addDays(startOfDay(new Date(to)), -29)); // default last 30 days

  const cached = unstable_cache(
    () => computeAnalytics({ from, to, projectId }),
    ["analytics", from, to, projectId ?? "all"],
    { revalidate: 300 }
  );

  const data = await cached();
  return NextResponse.json(toJsonValue(data));
}

