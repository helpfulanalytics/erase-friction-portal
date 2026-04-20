export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { signInviteToken } from "@/lib/session";
import { Resend } from "resend";
import { Timestamp } from "firebase-admin/firestore";
import type { Invite } from "@/types/models";

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function emailBaseStyles() {
  return {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    textColor: "#09090b",
    muted: "#52525b",
    brand: "#B9FF66",
    border: "#000000",
    bg: "#ffffff",
    shadow: "6px 6px 0px 0px #000000",
  } as const;
}

export async function POST(request: Request) {
  const body = await request.json() as {
    email:      string;
    name:       string;
    company:    string;
    projectIds: string[];
    role?:      "ADMIN" | "CLIENT";
  };

  const inviteRef = adminDb.collection("invites").doc();
  const inviteId  = inviteRef.id;

  const token = await signInviteToken({ inviteId, email: body.email });

  const expiresAt = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);

  const invite: Invite = {
    email:      body.email,
    name:       body.name,
    company:    body.company,
    projectIds: body.projectIds ?? [],
    role:       body.role ?? "CLIENT",
    token,
    expiresAt,
    accepted:   false,
    createdAt:  Timestamp.now(),
  };

  await inviteRef.set(invite);

  const acceptUrl = `${appUrl()}/invite/${token}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY env var is not set" },
      { status: 500 }
    );
  }

  const s = emailBaseStyles();
  const logoUrl = `${appUrl()}/logo-black.svg`;
  const previewText = "You’ve been invited to Nadiron (expires in 72 hours).";

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from:    "Nadiron <noreply@nadiron.com>",
    to:      body.email,
    subject: "You've been invited to Nadiron",
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${previewText}
      </div>

      <div style="margin:0;padding:32px;background:${s.bg};color:${s.textColor};font-family:${s.fontFamily};">
        <div style="max-width:560px;margin:0 auto;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:44px;height:44px;border:2px solid ${s.border};border-radius:14px;background:${s.brand};box-shadow:${s.shadow};display:flex;align-items:center;justify-content:center;">
              <img src="${logoUrl}" width="28" height="28" alt="Nadiron" style="display:block;" />
            </div>
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1;color:${s.textColor};">
              Nadiron
            </div>
          </div>

          <div style="border:2px solid ${s.border};border-radius:18px;box-shadow:${s.shadow};padding:22px;">
            <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px 0;">
              You’ve been invited
            </div>
            <div style="font-size:14px;line-height:1.6;color:${s.muted};margin:0 0 14px 0;">
              Hi ${body.name}, you’ve been invited to access the Nadiron client portal.
              This invite expires in <strong>72 hours</strong>.
            </div>

            <a href="${acceptUrl}"
              style="display:inline-block;background:${s.brand};color:${s.textColor};text-decoration:none;font-weight:800;border:2px solid ${s.border};border-radius:14px;box-shadow:${s.shadow};padding:12px 16px;">
              Accept invite
            </a>

            <div style="font-size:12px;line-height:1.6;color:${s.muted};margin-top:16px;">
              If you weren’t expecting this invite, you can ignore this email.
            </div>
          </div>

          <div style="font-size:12px;line-height:1.6;color:${s.muted};margin-top:14px;">
            Or paste this link into your browser:<br />
            <a href="${acceptUrl}" style="color:${s.textColor};text-decoration:underline;word-break:break-all;">
              ${acceptUrl}
            </a>
          </div>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ success: true, inviteId });
}
