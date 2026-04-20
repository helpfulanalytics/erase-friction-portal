export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { notifyInvoiceSent } from "@/lib/server/invoices-notify";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const { id } = await params;
  const invoiceRef = adminDb.collection("invoices").doc(id);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const invoice = invoiceSnap.data() as Record<string, unknown>;
  const projectId = String(invoice.projectId ?? "");
  if (!projectId) return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  await assertProjectMember(session, projectId);

  await notifyInvoiceSent({ invoiceId: id, projectId, session });

  return NextResponse.json({ success: true });
}

