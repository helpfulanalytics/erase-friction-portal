export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  // Run all counts in parallel
  const [
    projectsSnap,
    usersSnap,
    docsSnap,
    invoicesSnap,
    assetsSnap,
    messagesSnap,
    timeSnap,
  ] = await Promise.all([
    adminDb.collection("projects").get(),
    adminDb.collection("users").get(),
    adminDb.collection("documents").get(),
    adminDb.collection("invoices").get(),
    adminDb.collection("assets").get(),
    adminDb.collection("messages").get(),
    adminDb.collection("timeEntries").get(),
  ]);

  // Project breakdown by status
  const projectsByStatus: Record<string, number> = {};
  for (const d of projectsSnap.docs) {
    const status = String((d.data() as Record<string, unknown>).status ?? "ACTIVE");
    projectsByStatus[status] = (projectsByStatus[status] ?? 0) + 1;
  }

  // Users by role
  let adminCount = 0;
  let clientCount = 0;
  for (const d of usersSnap.docs) {
    const role = String((d.data() as Record<string, unknown>).role ?? "CLIENT");
    if (role === "ADMIN") adminCount++;
    else clientCount++;
  }

  // Invoice totals
  let invoiceTotal = 0;
  let invoicePaid = 0;
  let invoicePending = 0;
  let invoiceOverdue = 0;
  let revenueTotal = 0;
  let revenuePaid = 0;
  for (const d of invoicesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const status = String(data.status ?? "PENDING");
    const amount = typeof data.amount === "number" ? data.amount : 0;
    invoiceTotal++;
    revenueTotal += amount;
    if (status === "PAID") { invoicePaid++; revenuePaid += amount; }
    else if (status === "OVERDUE") invoiceOverdue++;
    else invoicePending++;
  }

  // Total time logged (minutes)
  let totalMinutes = 0;
  for (const d of timeSnap.docs) {
    const dur = (d.data() as Record<string, unknown>).duration;
    totalMinutes += typeof dur === "number" ? dur : 0;
  }

  // Docs by status
  const docsByStatus: Record<string, number> = {};
  for (const d of docsSnap.docs) {
    const status = String((d.data() as Record<string, unknown>).status ?? "DRAFT");
    docsByStatus[status] = (docsByStatus[status] ?? 0) + 1;
  }

  // Recent projects for the activity list
  const recentProjects = projectsSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, name: data.name, status: data.status, createdAt: data.createdAt };
    })
    .sort((a, b) => {
      const aT = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const bT = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return bT - aT;
    })
    .slice(0, 5);

  return NextResponse.json(toJsonValue({
    projects: {
      total: projectsSnap.size,
      byStatus: projectsByStatus,
    },
    users: {
      total: usersSnap.size,
      admins: adminCount,
      clients: clientCount,
    },
    documents: {
      total: docsSnap.size,
      byStatus: docsByStatus,
    },
    invoices: {
      total: invoiceTotal,
      paid: invoicePaid,
      pending: invoicePending,
      overdue: invoiceOverdue,
      revenueTotal,
      revenuePaid,
    },
    assets: { total: assetsSnap.size },
    messages: { total: messagesSnap.size },
    time: { totalMinutes },
    recentProjects,
  }));
}
