export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertDocAdmin, assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocOr404(id);
  const projectId = await assertCanAccessDoc(session, doc.data);

  const signatureSnap = await adminDb
    .collection("signatures")
    .where("documentId", "==", id)
    .where("userId", "==", session.uid)
    .limit(1)
    .get();

  const signature = signatureSnap.empty ? null : { id: signatureSnap.docs[0]!.id, ...signatureSnap.docs[0]!.data() };

  const commentsSnap = await adminDb
    .collection("comments")
    .where("documentId", "==", id)
    .orderBy("createdAt", "asc")
    .get();

  const comments = commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const versionsSnap = await adminDb
    .collection("docVersions")
    .where("documentId", "==", id)
    .orderBy("version", "desc")
    .limit(20)
    .get();

  const versions = versionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({
    projectId,
    document: toJsonValue({ id: doc.id, ...doc.data }),
    signature: toJsonValue(signature),
    comments: toJsonValue(comments),
    versions: toJsonValue(versions),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertDocAdmin(session);

  const { id } = await params;
  const doc = await getDocOr404(id);
  await assertCanAccessDoc(session, doc.data);

  const body = await request.json() as {
    title?: string;
    content?: unknown;
    type?: string;
    status?: string;
  };

  const update: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.content !== undefined) update.content = body.content;
  if (typeof body.type === "string") update.type = body.type;
  if (typeof body.status === "string") update.status = body.status;

  await doc.ref.update(update);
  return NextResponse.json({ success: true });
}

