export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertDocAdmin, assertCanAccessDoc, getDocOr404 } from "@/lib/server/documents-access";
import { logActivityEvent } from "@/lib/server/activity-events";
import { createNotification } from "@/lib/server/notifications";
import { resendFrom } from "@/lib/resend-from";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertDocAdmin(session);

  const { id: docId } = await params;
  const doc = await getDocOr404(docId);
  const projectId = await assertCanAccessDoc(session, doc.data);

  await doc.ref.update({ status: "REVIEW", updatedAt: Timestamp.now() });

  await logActivityEvent({
    projectId,
    session,
    type: "DOC_REQUEST_APPROVAL",
    description: "requested approval",
    documentId: docId,
  });

  // Notify + email all CLIENT members on the project (excluding actor).
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
    const clients: { uid: string; email: string; name: string }[] = [];
    for (const d of userDocs) {
      if (!d.exists) continue;
      const data = d.data() as Record<string, unknown>;
      if (String(data.role ?? "") !== "CLIENT") continue;
      const email = String(data.email ?? "");
      if (!email) continue;
      clients.push({ uid: d.id, email, name: String(data.name ?? "") });
    }

    await Promise.all(
      clients.map((c) =>
        createNotification({
          userId: c.uid,
          type: "DOC_APPROVAL_REQUESTED",
          title: "Approval requested",
          body: `Please review and approve “${String(doc.data.title ?? "Document")}”.`,
          link: `/dashboard/docs/${encodeURIComponent(docId)}`,
          meta: { projectId, docId },
        })
      )
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const docTitle = String(doc.data.title ?? "Document");
      const viewUrl = `${appUrl}/dashboard/docs/${docId}`;

      await Promise.all(
        clients.map((c) =>
          resend.emails.send({
            from: resendFrom(),
            to: c.email,
            subject: `Approval requested: ${docTitle}`,
            html: `
              <div style="margin:0;padding:28px;background:#ffffff;color:#09090b;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
                <div style="max-width:560px;margin:0 auto;border:2px solid #000;border-radius:18px;box-shadow:6px 6px 0px 0px #000;padding:20px;">
                  <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px;">Approval requested</div>
                  <div style="font-size:14px;line-height:1.6;color:#52525b;margin-bottom:14px;">
                    ${session.email} requested your approval for <strong>${docTitle}</strong>.
                  </div>
                  <a href="${viewUrl}" style="display:inline-block;background:#f59e0b;color:#09090b;text-decoration:none;font-weight:800;border:2px solid #000;border-radius:14px;box-shadow:6px 6px 0px 0px #000;padding:12px 16px;">
                    Review document
                  </a>
                </div>
              </div>
            `,
          })
        )
      );
    }
  }

  return NextResponse.json({ success: true });
}

