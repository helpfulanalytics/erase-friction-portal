import "server-only";

import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";
import type { SessionPayload } from "@/types/models";
import { createNotification } from "@/lib/server/notifications";
import { logActivity } from "@/lib/server/activity-events";
import { resendFrom } from "@/lib/resend-from";

export async function notifyInvoiceSent(args: {
  invoiceId: string;
  projectId: string;
  session: SessionPayload;
}) {
  const membersSnap = await adminDb
    .collection("projectMembers")
    .where("projectId", "==", args.projectId)
    .get();
  const memberIds = membersSnap.docs.map((d) => d.data().userId as string).filter(Boolean);

  const userDocs = await adminDb.getAll(
    ...memberIds.map((uid) => adminDb.collection("users").doc(uid))
  );
  const clients: { uid: string; email: string }[] = [];
  for (const d of userDocs) {
    if (!d.exists) continue;
    const data = d.data() as Record<string, unknown>;
    if (String(data.role ?? "") !== "CLIENT") continue;
    const email = String(data.email ?? "");
    if (!email) continue;
    clients.push({ uid: d.id, email });
  }

  await Promise.all(
    clients.map((c) =>
      createNotification({
        userId: c.uid,
        type: "INVOICE_SENT",
        title: "Invoice sent",
        body: `A new invoice is available.`,
        link: `/invoices`,
        meta: { invoiceId: args.invoiceId, projectId: args.projectId },
      })
    )
  );

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && clients.length > 0) {
    const resend = new Resend(resendApiKey);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const viewUrl = `${appUrl}/invoices`;
    await Promise.all(
      clients.map((c) =>
        resend.emails.send({
          from: resendFrom(),
          to: c.email,
          subject: "Invoice sent",
          html: `
            <div style="margin:0;padding:28px;background:#ffffff;color:#09090b;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
              <div style="max-width:560px;margin:0 auto;border:2px solid #000;border-radius:18px;box-shadow:6px 6px 0px 0px #000;padding:20px;">
                <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px;">Invoice sent</div>
                <div style="font-size:14px;line-height:1.6;color:#52525b;margin-bottom:14px;">
                  A new invoice is available in your Erase Friction portal.
                </div>
                <a href="${viewUrl}" style="display:inline-block;background:#f59e0b;color:#09090b;text-decoration:none;font-weight:800;border:2px solid #000;border-radius:14px;box-shadow:6px 6px 0px 0px #000;padding:12px 16px;">
                  View invoice
                </a>
              </div>
            </div>
          `,
        })
      )
    );
  }

  await logActivity({
    projectId: args.projectId,
    session: args.session,
    type: "invoice.sent",
    description: "sent an invoice",
    meta: { invoiceId: args.invoiceId },
  });
}

