export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";
import { logActivityEvent } from "@/lib/server/activity-events";
import { createNotification } from "@/lib/server/notifications";
import { normalizeSignerName } from "@/lib/normalize-signer-name";
import type { User } from "@/types/models";

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

  const body = (await request.json()) as {
    typedFullName?: unknown;
    acknowledge?: unknown;
    signatureData?: unknown;
  };

  let signatureData: string;

  const typedRaw = typeof body.typedFullName === "string" ? body.typedFullName.trim().replace(/\s+/g, " ") : "";
  const acknowledge = body.acknowledge === true;

  if (acknowledge && typedRaw.length >= 2) {
    const userSnap = await adminDb.collection("users").doc(session.uid).get();
    const u = userSnap.exists ? (userSnap.data() as User) : undefined;
    const expected =
      u?.name?.trim() ||
      session.email?.split("@")[0]?.trim() ||
      "";
    if (!expected.trim()) {
      return NextResponse.json({ error: "Account name is missing; contact support." }, { status: 400 });
    }
    if (normalizeSignerName(typedRaw) !== normalizeSignerName(expected)) {
      return NextResponse.json(
        { error: "Typed name must match your account name exactly." },
        { status: 400 }
      );
    }
    signatureData = JSON.stringify({
      kind: "typed_ack",
      version: 1,
      typedFullName: typedRaw,
    });
  } else {
    const legacy = typeof body.signatureData === "string" ? body.signatureData : "";
    if (legacy.startsWith("data:image")) {
      signatureData = legacy;
    } else {
      return NextResponse.json(
        {
          error:
            "Send typedFullName (matching your profile) and acknowledge: true, or a data:image signature for legacy clients.",
        },
        { status: 400 }
      );
    }
  }

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
    description: "approved (typed confirmation)",
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

