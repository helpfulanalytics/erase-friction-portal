export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

type ActiveTimerDoc = {
  userId: string;
  projectId: string;
  taskId: string | null;
  description: string;
  startedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
};

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  if (session.role === "ADMIN") {
    const snap = await adminDb.collection("activeTimers").orderBy("updatedAt", "desc").limit(500).get();
    const timers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ timers: toJsonValue(timers) });
  }

  const snap = await adminDb.collection("activeTimers").doc(session.uid).get();
  const timer = snap.exists ? ({ id: snap.id, ...snap.data() } as const) : null;
  return NextResponse.json({ timer: toJsonValue(timer) });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const body = (await request.json()) as {
    userId?: string;
    projectId: string;
    taskId?: string | null;
    description?: string;
    startedAtMs?: number | null;
  };

  const userId = String(body.userId ?? session.uid).trim();
  if (session.role !== "ADMIN" && userId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const now = Timestamp.now();
  const startedAt =
    typeof body.startedAtMs === "number" ? Timestamp.fromMillis(body.startedAtMs) : now;

  const doc: ActiveTimerDoc = {
    userId,
    projectId,
    taskId: body.taskId ?? null,
    description: String(body.description ?? "").trim(),
    startedAt,
    updatedAt: now,
  };

  await adminDb.collection("activeTimers").doc(userId).set(doc, { merge: true });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const body = (await request.json()) as Partial<{
    userId: string;
    projectId: string;
    taskId: string | null;
    description: string;
  }>;

  const userId = String(body.userId ?? session.uid).trim();
  if (session.role !== "ADMIN" && userId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (typeof body.projectId === "string") update.projectId = body.projectId.trim();
  if (body.taskId === null || typeof body.taskId === "string") update.taskId = body.taskId;
  if (typeof body.description === "string") update.description = body.description.trim();

  await adminDb.collection("activeTimers").doc(userId).set(update, { merge: true });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const url = new URL(request.url);
  const userId = String(url.searchParams.get("userId") ?? session.uid).trim();
  if (session.role !== "ADMIN" && userId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await adminDb.collection("activeTimers").doc(userId).delete();
  return NextResponse.json({ success: true });
}

