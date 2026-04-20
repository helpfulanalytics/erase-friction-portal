export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { deleteFromDrive } from "@/lib/google-drive";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { logActivity } from "@/lib/server/activity-events";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const { id } = await params;
  const ref = adminDb.collection("invoices").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = snap.data() as Record<string, unknown>;
  const projectId = String(invoice.projectId ?? "");
  if (!projectId) return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  await assertProjectMember(session, projectId);

  const body = (await request.json()) as Partial<{
    status: "PENDING" | "PAID" | "OVERDUE";
    fileUrl: string | null;
    storagePath: string | null;
    dueDate: number;
    amount: number;
  }>;

  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.fileUrl !== undefined) update.fileUrl = body.fileUrl;
  if (body.storagePath !== undefined) update.storagePath = body.storagePath;
  if (typeof body.dueDate === "number") update.dueDate = Timestamp.fromMillis(body.dueDate);
  if (typeof body.amount === "number") update.amount = body.amount;

  await ref.update(update);

  if (body.status === "PAID") {
    await logActivity({
      projectId,
      session,
      type: "invoice.paid",
      description: "marked an invoice as paid",
      meta: { invoiceId: id },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const { id } = await params;
  const ref = adminDb.collection("invoices").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = snap.data() as Record<string, unknown>;
  const projectId = String(invoice.projectId ?? "");
  if (!projectId) return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  await assertProjectMember(session, projectId);

  const driveFileId = String(invoice.driveFileId ?? "");
  if (driveFileId) {
    try {
      await deleteFromDrive(driveFileId);
    } catch {}
  }

  await ref.delete();
  await logActivity({
    projectId,
    session,
    type: "invoice.deleted",
    description: "deleted an invoice",
    meta: { invoiceId: id },
  });

  return NextResponse.json({ success: true });
}

