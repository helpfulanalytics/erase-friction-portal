export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOnly, clampLimit, parseDateYYYYMMDD } from "@/lib/server/time-access";
import { toCsv } from "@/lib/server/csv";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  assertAdminOnly(session);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const userId = url.searchParams.get("userId");
  const from = parseDateYYYYMMDD(url.searchParams.get("from"));
  const to = parseDateYYYYMMDD(url.searchParams.get("to"));
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 2000) || 2000, 1, 5000);

  const effectiveUserId =
    session.role === "ADMIN" ? (userId ? String(userId).trim() : null) : session.uid;

  if (session.role !== "ADMIN" && userId && String(userId).trim() !== session.uid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let q: FirebaseFirestore.Query = adminDb.collection("timeEntries");
  if (projectId) q = q.where("projectId", "==", projectId);
  if (effectiveUserId) q = q.where("userId", "==", effectiveUserId);
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);

  const snap = await q.orderBy("date", "asc").orderBy("createdAt", "asc").limit(limit).get();
  const entries: Record<string, unknown>[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  const userIds = Array.from(new Set(entries.map((e) => String(e.userId ?? "")).filter(Boolean)));
  const projectIds = Array.from(new Set(entries.map((e) => String(e.projectId ?? "")).filter(Boolean)));
  const taskIds = Array.from(new Set(entries.map((e) => String(e.taskId ?? "")).filter(Boolean)));

  const userDocs = userIds.length ? await adminDb.getAll(...userIds.map((id) => adminDb.collection("users").doc(id))) : [];
  const projectDocs = projectIds.length ? await adminDb.getAll(...projectIds.map((id) => adminDb.collection("projects").doc(id))) : [];
  const taskDocs = taskIds.length ? await adminDb.getAll(...taskIds.map((id) => adminDb.collection("tasks").doc(id))) : [];

  const userNameById = new Map<string, string>();
  for (const d of userDocs) {
    const data = d.data() as Record<string, unknown> | undefined;
    userNameById.set(d.id, String(data?.name ?? data?.email ?? d.id));
  }
  const projectNameById = new Map<string, string>();
  for (const d of projectDocs) {
    const data = d.data() as Record<string, unknown> | undefined;
    projectNameById.set(d.id, String(data?.name ?? d.id));
  }
  const taskNameById = new Map<string, string>();
  for (const d of taskDocs) {
    const data = d.data() as Record<string, unknown> | undefined;
    taskNameById.set(d.id, String(data?.title ?? data?.name ?? d.id));
  }

  const rows: string[][] = [
    [
      "Date",
      "Member",
      "Project",
      "Task",
      "Description",
      "Duration (mins)",
      "Duration (hrs)",
      "Source",
      "Repo",
      "Branch",
      "Commit SHA",
      "Commit URL",
      "PR #",
      "PR URL",
    ],
  ];

  for (const e of entries) {
    const mins = Number(e.duration ?? 0) || 0;
    const hrs = (mins / 60).toFixed(2);
    rows.push([
      String(e.date ?? ""),
      userNameById.get(String(e.userId ?? "")) ?? "",
      projectNameById.get(String(e.projectId ?? "")) ?? "",
      e.taskId ? (taskNameById.get(String(e.taskId)) ?? "") : "",
      String(e.description ?? ""),
      String(mins),
      String(hrs),
      String(e.source ?? ""),
      String(e.repoFullName ?? ""),
      String(e.branchName ?? ""),
      String(e.commitSha ?? ""),
      String(e.commitUrl ?? ""),
      e.prNumber === null || e.prNumber === undefined ? "" : String(e.prNumber),
      String(e.prUrl ?? ""),
    ]);
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"time-export.csv\"`,
    },
  });
}

