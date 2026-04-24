export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { resendFrom } from "@/lib/resend-from";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

type ReminderKind = "start" | "midday" | "end";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return NextResponse.json({ error: "RESEND_API_KEY env var is not set" }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { kind?: ReminderKind; dryRun?: boolean };
  const kind = body.kind ?? "midday";
  if (kind !== "start" && kind !== "midday" && kind !== "end") {
    return NextResponse.json({ error: "kind must be start | midday | end" }, { status: 400 });
  }

  const targetEmail = "hello@tosinxt.com";
  const userSnap = await adminDb.collection("users").where("email", "==", targetEmail).limit(1).get();
  if (userSnap.empty) return NextResponse.json({ success: true, sent: 0, reason: "user_not_found" });

  const userDoc = userSnap.docs[0]!;
  const userId = userDoc.id;
  const name = String((userDoc.data() as { name?: string } | undefined)?.name ?? "").trim() || "Tosin";

  const date = todayYMD();
  const app = appUrl();

  const entriesSnap = await adminDb
    .collection("timeEntries")
    .where("userId", "==", userId)
    .where("date", "==", date)
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();

  const totalMins = entriesSnap.docs.reduce((sum, d) => {
    const dur = (d.data() as { duration?: number } | undefined)?.duration ?? 0;
    return sum + (Number(dur) || 0);
  }, 0);

  const activeSnap = await adminDb.collection("activeTimers").doc(userId).get();
  const hasActive = activeSnap.exists;

  const shouldSend = (() => {
    if (kind === "start") return true;
    if (kind === "midday") return totalMins === 0 && !hasActive;
    return hasActive || totalMins < 6 * 60;
  })();

  if (!shouldSend) {
    return NextResponse.json({ success: true, sent: 0, skipped: true, kind, totalMins, hasActive });
  }

  const subject =
    kind === "start"
      ? "Start your work timer"
      : kind === "midday"
        ? "Reminder: log time for today"
        : "Wrap up: stop timer / log remaining time";

  const headline =
    kind === "start"
      ? "Ready to start work?"
      : kind === "midday"
        ? "Quick check-in"
        : "End-of-day reminder";

  const bodyText =
    kind === "start"
      ? "Start your timer so your hours are captured for payroll."
      : kind === "midday"
        ? "You haven’t logged any time yet today. Add an entry or start the timer."
        : hasActive
          ? "You still have a timer running. Stop it to save your entry."
          : "If you did work today, make sure your hours are logged.";

  const ctaLabel = kind === "start" ? "Open time tracking" : kind === "midday" ? "Log time now" : "Review today";
  const ctaUrl = `${app}/dashboard/time`;

  if (body.dryRun) {
    return NextResponse.json({ success: true, sent: 0, dryRun: true, wouldSend: true, kind, to: targetEmail, subject });
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: resendFrom(),
    to: targetEmail,
    subject,
    html: `
      <div style="margin:0;padding:28px;background:#ffffff;color:#09090b;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
        <div style="max-width:560px;margin:0 auto;border:2px solid #000;border-radius:18px;box-shadow:6px 6px 0px 0px #000;padding:20px;">
          <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px;">${headline}</div>
          <div style="font-size:14px;line-height:1.6;color:#52525b;margin-bottom:14px;">
            Hi ${name} — ${bodyText}
          </div>
          <a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#09090b;text-decoration:none;font-weight:800;border:2px solid #000;border-radius:14px;box-shadow:6px 6px 0px 0px #000;padding:10px 14px;">
            ${ctaLabel}
          </a>
          <div style="font-size:12px;line-height:1.6;color:#52525b;margin-top:14px;">
            Today logged: <strong>${(totalMins / 60).toFixed(1)}h</strong>${hasActive ? " (timer running)" : ""}.
          </div>
        </div>
      </div>
    `,
  });

  await adminDb.collection("timeReminderMarkers").doc(userId).set(
    {
      lastSentAt: Timestamp.now(),
      lastKind: kind,
      lastDate: date,
    },
    { merge: true }
  );

  return NextResponse.json({ success: true, sent: 1, kind, totalMins, hasActive });
}

