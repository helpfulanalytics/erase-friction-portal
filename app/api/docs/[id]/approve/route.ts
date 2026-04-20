export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";
import { logActivityEvent } from "@/lib/server/activity-events";
import { createNotification } from "@/lib/server/notifications";

function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "";
}

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
  const status = String(doc.data.status ?? "DRAFT");

  if (type !== "CLIENT_VISIBLE" || status !== "REVIEW") {
    return NextResponse.json({ error: "Document is not ready for approval" }, { status: 409 });
  }

  const body = await request.json() as { signatureData: string };
  const signatureData = String(body.signatureData ?? "");
  if (!signatureData) return NextResponse.json({ error: "signatureData is required" }, { status: 400 });

  await adminDb.collection("signatures").add({
    documentId: docId,
    userId: session.uid,
    signedAt: Timestamp.now(),
    signatureData,
    ipAddress: ipFromRequest(request),
  });

  await doc.ref.update({ status: "APPROVED", updatedAt: Timestamp.now() });

  await logActivityEvent({
    projectId,
    session,
    type: "DOC_APPROVED",
    description: "approved and signed",
    documentId: docId,
  });

  // Notify admins on the project that this doc was approved.
  const membersSnap = await adminDb
    .collection("projectMembers")
    .where("projectId", "==", projectId)
    .get();
  const memberIds = membersSnap.docs
    .map((d) => d.data().userId as string)
    .filter((uid) => uid && uid !== session.uid);

  if (memberIds.length > 0) {
    const userDocs = await adminDb.getAll(
      ...memberIds.map((uid) => adminDb.collection("users").doc(uid))
    );
    const admins: { uid: string }[] = [];
    for (const d of userDocs) {
      if (!d.exists) continue;
      const data = d.data() as Record<string, unknown>;
      if (String(data.role ?? "") !== "ADMIN") continue;
      admins.push({ uid: d.id });
    }

    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.uid,
          type: "DOC_APPROVED",
          title: "Document approved",
          body: `A client approved “${String(doc.data.title ?? "Document")}”.`,
          link: `/admin/docs/${encodeURIComponent(docId)}/edit`,
          meta: { projectId, docId },
        })
      )
    );
  }

  return NextResponse.json({ success: true });
}

