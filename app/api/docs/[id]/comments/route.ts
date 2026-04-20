export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";
import { logActivityEvent } from "@/lib/server/activity-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: docId } = await params;
  const doc = await getDocOr404(docId);
  const projectId = await assertCanAccessDoc(session, doc.data);

  const type = String(doc.data.type ?? "INTERNAL");
  if (session.role !== "ADMIN" && type !== "CLIENT_VISIBLE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { body: string };
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

  await adminDb.collection("comments").add({
    documentId: docId,
    userId: session.uid,
    body: text,
    resolved: false,
    createdAt: Timestamp.now(),
  });

  await logActivityEvent({
    projectId,
    session,
    type: "DOC_COMMENT",
    description: "left a comment",
    documentId: docId,
  });

  return NextResponse.json({ success: true });
}

