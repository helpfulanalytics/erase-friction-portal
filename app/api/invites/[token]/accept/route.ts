export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyInviteToken } from "@/lib/session";
import { Timestamp } from "firebase-admin/firestore";
import type { User, ProjectMember } from "@/types/models";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { name }  = await request.json() as { name: string };

  const payload = await verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const inviteRef = adminDb.collection("invites").doc(payload.inviteId);
  const inviteDoc = await inviteRef.get();
  if (!inviteDoc.exists) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteDoc.data()!;
  if (invite.accepted) {
    return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  }

  // Get or Create Firebase Auth user
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(invite.email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await adminAuth.createUser({
        email:       invite.email,
        displayName: name,
      });
    } else {
      throw error;
    }
  }

  // Set custom claims for role
  await adminAuth.setCustomUserClaims(userRecord.uid, { role: invite.role });

  // Write/Update Firestore user doc
  await adminDb.collection("users").doc(userRecord.uid).set({
    email:     invite.email,
    name,
    role:      invite.role,
    company:   invite.company,
  }, { merge: true });

  // Write projectMembers docs
  const batch = adminDb.batch();
  for (const projectId of (invite.projectIds as string[])) {
    const memberRef = adminDb.collection("projectMembers").doc();
    const member: ProjectMember = { userId: userRecord.uid, projectId };
    batch.set(memberRef, member);
  }
  await batch.commit();

  // Mark invite as accepted
  await inviteRef.update({ accepted: true });

  // Return custom token for client to exchange
  const customToken = await adminAuth.createCustomToken(userRecord.uid);

  return NextResponse.json({ customToken });
}
