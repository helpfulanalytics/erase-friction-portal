export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";
import { signMagicLinkToken } from "@/lib/session";

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
    brand: "#f59e0b",
    border: "#000000",
    bg: "#ffffff",
    shadow: "6px 6px 0px 0px #000000",
  } as const;
}

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY env var is not set" }, { status: 500 });
  }

  const body = await request.json() as {
    email: string;
    callbackUrl?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Only allow sign-in for existing users (invite-only).
  const existing = await adminDb.collection("users").where("email", "==", email).limit(1).get();
  if (existing.empty) {
    return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
  }

  const token = await signMagicLinkToken({ email });

  const callbackUrl =
    typeof body.callbackUrl === "string" && body.callbackUrl.startsWith("/")
      ? body.callbackUrl
      : "/dashboard";

  const link = `${appUrl()}/api/auth/magic-link/callback?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const s = emailBaseStyles();
  const logoUrl = `${appUrl()}/logo-black.svg`;
  const previewText = "Your sign-in link is ready (expires in 15 minutes).";

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: "Erase Friction <noreply@Erase Friction.com>",
    to: email,
    subject: "Your sign-in link for Erase Friction",
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${previewText}
      </div>

      <div style="margin:0;padding:32px;background:${s.bg};color:${s.textColor};font-family:${s.fontFamily};">
        <div style="max-width:560px;margin:0 auto;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:44px;height:44px;border:2px solid ${s.border};border-radius:14px;background:${s.brand};box-shadow:${s.shadow};display:flex;align-items:center;justify-content:center;">
              <img src="${logoUrl}" width="28" height="28" alt="Erase Friction" style="display:block;" />
            </div>
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1;color:${s.textColor};">
              Erase Friction
            </div>
          </div>

          <div style="border:2px solid ${s.border};border-radius:18px;box-shadow:${s.shadow};padding:22px;">
            <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px 0;">
              Sign in to your portal
            </div>
            <div style="font-size:14px;line-height:1.6;color:${s.muted};margin:0 0 18px 0;">
              Use the button below to sign in. This link expires in <strong>15 minutes</strong>.
            </div>

            <a href="${link}"
              style="display:inline-block;background:${s.brand};color:${s.textColor};text-decoration:none;font-weight:800;border:2px solid ${s.border};border-radius:14px;box-shadow:${s.shadow};padding:12px 16px;">
              Sign in
            </a>

            <div style="font-size:12px;line-height:1.6;color:${s.muted};margin-top:16px;">
              If you didn’t request this email, you can safely ignore it.
            </div>
          </div>

          <div style="font-size:12px;line-height:1.6;color:${s.muted};margin-top:14px;">
            Or paste this link into your browser:<br />
            <a href="${link}" style="color:${s.textColor};text-decoration:underline;word-break:break-all;">
              ${link}
            </a>
          </div>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}

