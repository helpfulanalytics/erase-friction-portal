export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertDocAdmin, assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertDocAdmin(session);

  const { id: docId, cid } = await params;
  const doc = await getDocOr404(docId);
  await assertCanAccessDoc(session, doc.data);

  const body = await request.json() as { resolved: boolean };
  await adminDb.collection("comments").doc(cid).update({ resolved: Boolean(body.resolved) });

  return NextResponse.json({ success: true });
}

