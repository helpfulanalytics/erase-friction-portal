import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";

import { adminDb } from "@/lib/firebase-admin";
import { signInviteToken } from "@/lib/session";
import { resendFrom } from "@/lib/resend-from";
import type { Invite, UserRole } from "@/types/models";

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

export type CreateInviteInput = {
  email: string;
  name: string;
  company: string;
  projectIds: string[];
  /** Stored on invite; invite accept only supports portal roles. */
  role?: UserRole;
};

/**
 * Persists an invite and sends the Resend email. Caller must enforce auth (e.g. assertAdmin).
 */
export async function createAndEmailInvite(input: CreateInviteInput): Promise<{ inviteId: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split("@")[0] || "User";
  const company = input.company.trim() || "Erase Friction";
  const projectIds = [...new Set(input.projectIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  const role: "ADMIN" | "CLIENT" = input.role === "ADMIN" ? "ADMIN" : "CLIENT";

  if (!email) throw new Error("Email is required");
  if (projectIds.length === 0) throw new Error("At least one project is required");

  const inviteRef = adminDb.collection("invites").doc();
  const inviteId = inviteRef.id;
  const token = await signInviteToken({ inviteId, email });
  const expiresAt = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);

  const invite: Invite = {
    email,
    name,
    company,
    projectIds,
    role,
    token,
    expiresAt,
    accepted: false,
    createdAt: Timestamp.now(),
  };

  await inviteRef.set(invite);

  const acceptUrl = `${appUrl()}/invite/${token}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY env var is not set");
  }

  const s = emailBaseStyles();
  const logoUrl = `${appUrl()}/logo-black.svg`;
  const previewText = "You’ve been invited to Erase Friction (expires in 72 hours).";

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: resendFrom(),
    to: email,
    subject: "You've been invited to Erase Friction",
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
              You’ve been invited
            </div>
            <div style="font-size:14px;line-height:1.6;color:${s.muted};margin:0 0 14px 0;">
              Hi ${name}, you’ve been invited to access the Erase Friction client portal.
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

  return { inviteId };
}
