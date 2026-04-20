export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertDocAdmin, assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertDocAdmin(session);

  const { id } = await params;
  const doc = await getDocOr404(id);
  await assertCanAccessDoc(session, doc.data);

  const currentVersion = Number(doc.data.version ?? 1);
  const nextVersion = Number.isFinite(currentVersion) ? currentVersion + 1 : 2;

  await adminDb.collection("docVersions").add({
    documentId: id,
    content: doc.data.content ?? [],
    version: nextVersion,
    createdAt: Timestamp.now(),
  });

  await doc.ref.update({ version: nextVersion, updatedAt: Timestamp.now() });

  return NextResponse.json({ success: true, version: nextVersion });
}

