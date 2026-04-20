export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev, assertProjectMember } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
type Status = (typeof STATUSES)[number];

function normalizeStatus(v: unknown): Status {
  const s = String(v ?? "").toUpperCase();
  if (STATUSES.includes(s as Status)) return s as Status;
  return "TODO";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  await assertProjectMember(session, projectId);

  const snap = await adminDb
    .collection("tasks")
    .where("projectId", "==", projectId)
    .orderBy("status", "asc")
    .orderBy("order", "asc")
    .get();

  const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Assignees: projectMembers -> users
  const membersSnap = await adminDb
    .collection("projectMembers")
    .where("projectId", "==", projectId)
    .get();

  const userIds = membersSnap.docs.map((d) => d.data().userId as string).filter(Boolean);
  const userDocs = userIds.length
    ? await adminDb.getAll(...userIds.map((uid) => adminDb.collection("users").doc(uid)))
    : [];

  const assignees = userDocs
    .filter((d) => d.exists)
    .map((d) => {
      const data = d.data() as { name?: string; email?: string; avatar?: string } | undefined;
      return { id: d.id, name: data?.name ?? data?.email ?? "User", avatar: data?.avatar ?? "" };
    });

  return NextResponse.json({
    tasks: toJsonValue(tasks),
    assignees: toJsonValue(assignees),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  assertAdminOrDev(session);

  const { id: projectId } = await params;
  await assertProjectMember(session, projectId);

  const body = await request.json() as {
    title: string;
    description?: unknown;
    progress?: number;
    status?: Status;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string | null;
    dueDate?: number | null; // ms
  };

  const status = normalizeStatus(body.status);

  const last = await adminDb
    .collection("tasks")
    .where("projectId", "==", projectId)
    .where("status", "==", status)
    .orderBy("order", "desc")
    .limit(1)
    .get();

  const nextOrder = last.empty ? 0 : (Number(last.docs[0]!.data().order ?? 0) + 1);

  const docRef = adminDb.collection("tasks").doc();
  await docRef.set({
    projectId,
    title: String(body.title ?? "").trim() || "Untitled task",
    description: body.description ?? null,
    progress: typeof body.progress === "number" ? body.progress : 0,
    status,
    priority: body.priority ?? "MEDIUM",
    assigneeId: body.assigneeId ?? null,
    dueDate: typeof body.dueDate === "number" ? Timestamp.fromMillis(body.dueDate) : null,
    order: nextOrder,
    createdAt: Timestamp.now(),
  });

  return NextResponse.json({ success: true, taskId: docRef.id });
}

