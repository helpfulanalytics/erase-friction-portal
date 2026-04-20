export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOnly, parseDateYYYYMMDD } from "@/lib/server/time-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOnly(session);

  const { id } = await params;
  const ref = adminDb.collection("timeEntries").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as Partial<{
    userId: string;
    projectId: string;
    taskId: string | null;
    description: string;
    startTime: number | null;
    endTime: number | null;
    duration: number;
    date: string;
  }>;

  const update: Record<string, unknown> = {};
  if (typeof body.userId === "string") update.userId = body.userId.trim();
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

  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOnly(session);

  const { id } = await params;
  await adminDb.collection("timeEntries").doc(id).delete();
  return NextResponse.json({ success: true });
}

