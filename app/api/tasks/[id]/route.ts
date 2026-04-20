export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev, assertProjectMember } from "@/lib/server/project-access";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
type Status = (typeof STATUSES)[number];

function normalizeStatus(v: unknown): Status | undefined {
  if (v === undefined) return undefined;
  const s = String(v ?? "").toUpperCase();
  if (STATUSES.includes(s as Status)) return s as Status;
  return undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const { id: taskId } = await params;
  const taskRef = adminDb.collection("tasks").doc(taskId);
  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = taskDoc.data() as { projectId?: string } | undefined;
  const projectId = task?.projectId;
  if (!projectId) return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  await assertProjectMember(session, projectId);

  const body = await request.json() as {
    // Simple field updates
    title?: string;
    description?: unknown;
    progress?: number;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string | null;
    dueDate?: number | null;
    status?: Status;
    order?: number;
    attachments?: string[];

    // Reorder payloads
    orderedIdsInStatus?: string[];
    reorder?: {
      source: { status: Status; ids: string[] };
      dest: { status: Status; ids: string[] };
    };
  };

  // Reorder within a column.
  if (Array.isArray(body.orderedIdsInStatus) && body.orderedIdsInStatus.length > 0) {
    const status = normalizeStatus(body.status) ?? (taskDoc.data() as { status?: Status }).status ?? "TODO";
    const batch = adminDb.batch();
    body.orderedIdsInStatus.forEach((id, idx) => {
      batch.update(adminDb.collection("tasks").doc(id), { status, order: idx });
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  }

  // Move between columns and reorder both.
  if (body.reorder) {
    const batch = adminDb.batch();
    body.reorder.source.ids.forEach((id, idx) => {
      batch.update(adminDb.collection("tasks").doc(id), { status: body.reorder!.source.status, order: idx });
    });
    body.reorder.dest.ids.forEach((id, idx) => {
      batch.update(adminDb.collection("tasks").doc(id), { status: body.reorder!.dest.status, order: idx });
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (typeof body.progress === "number") update.progress = body.progress;
  if (body.priority) update.priority = body.priority;
  if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
  if (body.dueDate !== undefined) {
    update.dueDate = typeof body.dueDate === "number" ? Timestamp.fromMillis(body.dueDate) : null;
  }
  if (Array.isArray(body.attachments)) {
    update.attachments = body.attachments.filter((u) => typeof u === "string" && u.length > 0).slice(0, 20);
  }
  if (body.order !== undefined && Number.isFinite(body.order)) update.order = body.order;
  const status = normalizeStatus(body.status);
  if (status) update.status = status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  await taskRef.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const { id: taskId } = await params;
  const taskRef = adminDb.collection("tasks").doc(taskId);
  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = taskDoc.data() as { projectId?: string } | undefined;
  const projectId = task?.projectId;
  if (!projectId) return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  await assertProjectMember(session, projectId);

  await taskRef.delete();
  return NextResponse.json({ success: true });
}

