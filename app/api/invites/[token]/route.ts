export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyInviteToken } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = await verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const doc = await adminDb.collection("invites").doc(payload.inviteId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = doc.data();
  if (invite?.accepted) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
  }

  return NextResponse.json({
    inviteId: payload.inviteId,
    email:    invite?.email,
    name:     invite?.name,
    company:  invite?.company,
  });
}
