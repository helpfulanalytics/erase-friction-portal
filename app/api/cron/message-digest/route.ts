export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return NextResponse.json({ error: "RESEND_API_KEY env var is not set" }, { status: 500 });
  const resend = new Resend(resendApiKey);

  // Find users with unread message notifications.
  const notifSnap = await adminDb
    .collection("notifications")
    .where("type", "==", "MESSAGE_RECEIVED")
    .where("read", "==", false)
    .orderBy("createdAt", "desc")
    .limit(1000)
    .get();

  if (notifSnap.empty) return NextResponse.json({ success: true, sent: 0 });

  const byUser = new Map<string, { id: string; title: string; body: string; link?: string | null; createdAt?: number }[]>();
  for (const d of notifSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const userId = String(data.userId ?? "");
    if (!userId) continue;
    const createdAt = (data.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
    const list = byUser.get(userId) ?? [];
    list.push({
      id: d.id,
      title: String(data.title ?? "New message"),
      body: String(data.body ?? ""),
      link: (data.link as string | null | undefined) ?? null,
      createdAt: createdAt ?? undefined,
    });
    byUser.set(userId, list);
  }

  const now = Timestamp.now();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  let sent = 0;
  for (const [userId, notifs] of byUser.entries()) {
    const markerRef = adminDb.collection("messageDigests").doc(userId);
    const markerSnap = await markerRef.get();
    const lastSentAt = (markerSnap.data() as { lastSentAt?: Timestamp } | undefined)?.lastSentAt;
    const lastMs = lastSentAt?.toMillis?.() ?? 0;

    const fresh = notifs
      .filter((n) => (n.createdAt ?? 0) > lastMs)
      .slice(0, 20);
    if (fresh.length === 0) continue;

    const userSnap = await adminDb.collection("users").doc(userId).get();
    const user = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
    const email = String(user.email ?? "");
    if (!email) continue;

    const itemsHtml = fresh
      .map((n) => {
        const url = n.link ? `${appUrl}${n.link}` : appUrl;
        return `<li style="margin:0 0 10px 0;">
          <div style="font-weight:800;">${n.title}</div>
          <div style="color:#52525b;line-height:1.6;">${n.body}</div>
          <a href="${url}" style="color:#09090b;text-decoration:underline;">Open</a>
        </li>`;
      })
      .join("");

    await resend.emails.send({
      from: "Erase Friction <noreply@Erase Friction.com>",
      to: email,
      subject: `Your Erase Friction messages (${fresh.length})`,
      html: `
        <div style="margin:0;padding:28px;background:#ffffff;color:#09090b;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
          <div style="max-width:560px;margin:0 auto;border:2px solid #000;border-radius:18px;box-shadow:6px 6px 0px 0px #000;padding:20px;">
            <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px;">Daily message digest</div>
            <div style="font-size:14px;line-height:1.6;color:#52525b;margin-bottom:14px;">
              You have new messages waiting in your portal.
            </div>
            <ul style="padding-left:18px;margin:0;">
              ${itemsHtml}
            </ul>
          </div>
        </div>
      `,
    });

    await markerRef.set({ lastSentAt: now }, { merge: true });
    sent += 1;
  }

  return NextResponse.json({ success: true, sent });
}

