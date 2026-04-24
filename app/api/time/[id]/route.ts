export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { parseDateYYYYMMDD } from "@/lib/server/time-access";
import { assertAdmin, assertAdminOrDev } from "@/lib/server/project-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const { id } = await params;
  const ref = adminDb.collection("timeEntries").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = snap.data() as { userId?: string } | undefined;
  const ownerId = existing?.userId ? String(existing.userId) : null;
  if (session.role !== "ADMIN") {
    if (!ownerId || ownerId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = (await request.json()) as Partial<{
    userId: string;
    projectId: string;
    taskId: string | null;
    description: string;
    startTime: number | null;
    endTime: number | null;
    duration: number;
    date: string;
    repoFullName: string | null;
    commitSha: string | null;
    commitUrl: string | null;
    prNumber: number | null;
    prUrl: string | null;
    branchName: string | null;
    source: "manual" | "timer" | null;
  }>;

  const update: Record<string, unknown> = {};
  if (typeof body.userId === "string") {
    const nextUserId = body.userId.trim();
    if (session.role !== "ADMIN" && nextUserId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    update.userId = nextUserId;
  }
  if (typeof body.projectId === "string") update.projectId = body.projectId.trim();
  if (body.taskId === null || typeof body.taskId === "string") update.taskId = body.taskId;
  if (typeof body.description === "string") update.description = body.description.trim();
  if (body.startTime === null || typeof body.startTime === "number") {
    update.startTime = body.startTime === null ? null : Timestamp.fromMillis(body.startTime);
  }
  if (body.endTime === null || typeof body.endTime === "number") {
    update.endTime = body.endTime === null ? null : Timestamp.fromMillis(body.endTime);
  }
  if (typeof body.duration === "number") update.duration = Math.max(0, Math.round(body.duration));
  if (typeof body.date === "string") {
    const d = parseDateYYYYMMDD(body.date);
    if (!d) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    update.date = d;
  }
  if (body.repoFullName === null || typeof body.repoFullName === "string") {
    update.repoFullName = body.repoFullName ? body.repoFullName.trim() : null;
  }
  if (body.commitSha === null || typeof body.commitSha === "string") {
    update.commitSha = body.commitSha ? body.commitSha.trim() : null;
  }
  if (body.commitUrl === null || typeof body.commitUrl === "string") {
    update.commitUrl = body.commitUrl ? body.commitUrl.trim() : null;
  }
  if (body.prNumber === null || typeof body.prNumber === "number") {
    update.prNumber = typeof body.prNumber === "number" ? Math.trunc(body.prNumber) : null;
  }
  if (body.prUrl === null || typeof body.prUrl === "string") {
    update.prUrl = body.prUrl ? body.prUrl.trim() : null;
  }
  if (body.branchName === null || typeof body.branchName === "string") {
    update.branchName = body.branchName ? body.branchName.trim() : null;
  }
  if (body.source === null || body.source === "manual" || body.source === "timer") {
    update.source = body.source ?? null;
  }

  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const { id } = await params;
  if (session.role !== "ADMIN") {
    const snap = await adminDb.collection("timeEntries").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ownerId = (snap.data() as { userId?: string } | undefined)?.userId
      ? String((snap.data() as { userId?: string }).userId)
      : null;
    if (!ownerId || ownerId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await adminDb.collection("timeEntries").doc(id).delete();
  return NextResponse.json({ success: true });
}

