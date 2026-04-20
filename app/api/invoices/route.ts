export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { notifyInvoiceSent } from "@/lib/server/invoices-notify";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const body = (await request.json()) as {
    projectId: string;
    number: string;
    amount: number;
    dueDate: number; // ms
    fileUrl?: string | null;
    storagePath?: string | null;
  };

  const projectId = String(body.projectId ?? "").trim();
  const number = String(body.number ?? "").trim();
  const amount = Number(body.amount ?? 0);
  const dueMs = Number(body.dueDate ?? 0);

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!number) return NextResponse.json({ error: "number is required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount is required" }, { status: 400 });
  if (!Number.isFinite(dueMs) || dueMs <= 0) return NextResponse.json({ error: "dueDate is required" }, { status: 400 });

  await assertProjectMember(session, projectId);

  const now = Timestamp.now();
  const ref = adminDb.collection("invoices").doc();
  await ref.set({
    projectId,
    number,
    invoiceNumber: number, // backward compat
    amount,
    currency: "NGN",
    status: "PENDING",
    dueDate: Timestamp.fromMillis(dueMs),
    fileUrl: body.fileUrl ?? null,
    storagePath: body.storagePath ?? null,
    createdAt: now,
  });

  // Trigger email + in-app notifications
  await notifyInvoiceSent({ invoiceId: ref.id, projectId, session });

  return NextResponse.json({ success: true, id: ref.id });
}

