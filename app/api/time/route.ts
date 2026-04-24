export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { clampLimit, parseDateYYYYMMDD } from "@/lib/server/time-access";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const userId = url.searchParams.get("userId");
  const from = parseDateYYYYMMDD(url.searchParams.get("from"));
  const to = parseDateYYYYMMDD(url.searchParams.get("to"));
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 500) || 500, 1, 2000);

  const effectiveUserId =
    session.role === "ADMIN" ? (userId ? String(userId).trim() : null) : session.uid;

  if (session.role !== "ADMIN" && userId && String(userId).trim() !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let q: FirebaseFirestore.Query = adminDb.collection("timeEntries");
  if (projectId) q = q.where("projectId", "==", projectId);
  if (effectiveUserId) q = q.where("userId", "==", effectiveUserId);
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);

  const snap = await q.orderBy("date", "desc").orderBy("createdAt", "desc").limit(limit).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ entries: toJsonValue(entries) });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const body = (await request.json()) as {
    userId: string;
    projectId: string;
    taskId?: string | null;
    description?: string;
    startTime?: number | null; // ms
    endTime?: number | null; // ms
    duration?: number | null; // mins
    date: string; // YYYY-MM-DD
    repoFullName?: string | null;
    commitSha?: string | null;
    commitUrl?: string | null;
    prNumber?: number | null;
    prUrl?: string | null;
    branchName?: string | null;
    source?: "manual" | "timer" | null;
  };

  const userId = String(body.userId ?? "").trim();
  const projectId = String(body.projectId ?? "").trim();
  const date = parseDateYYYYMMDD(body.date) ?? null;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });

  if (session.role !== "ADMIN" && userId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startMs = body.startTime ?? null;
  const endMs = body.endTime ?? null;
  const durationMins =
    typeof body.duration === "number"
      ? Math.max(0, Math.round(body.duration))
      : startMs && endMs
        ? Math.max(0, Math.round((endMs - startMs) / 60000))
        : 0;

  const now = Timestamp.now();
  const ref = await adminDb.collection("timeEntries").add({
    userId,
    projectId,
    taskId: body.taskId ?? null,
    description: String(body.description ?? "").trim(),
    startTime: startMs ? Timestamp.fromMillis(startMs) : null,
    endTime: endMs ? Timestamp.fromMillis(endMs) : null,
    duration: durationMins,
    date,
    repoFullName: body.repoFullName ? String(body.repoFullName).trim() : null,
    commitSha: body.commitSha ? String(body.commitSha).trim() : null,
    commitUrl: body.commitUrl ? String(body.commitUrl).trim() : null,
    prNumber: typeof body.prNumber === "number" ? Math.trunc(body.prNumber) : null,
    prUrl: body.prUrl ? String(body.prUrl).trim() : null,
    branchName: body.branchName ? String(body.branchName).trim() : null,
    source: body.source ? String(body.source) : null,
    createdAt: now,
  });

  return NextResponse.json({ success: true, id: ref.id });
}

