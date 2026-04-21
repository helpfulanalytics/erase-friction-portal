export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { createAndEmailInvite } from "@/lib/server/create-and-email-invite";
import { toJsonValue } from "@/lib/server/firestore-serialize";
import type { UserRole } from "@/types/models";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const snap = await adminDb
    .collection("projectMembers")
    .where("projectId", "==", projectId)
    .get();

  const userIds = snap.docs.map((d) => d.data().userId as string).filter(Boolean);
  if (userIds.length === 0) {
    return NextResponse.json({ members: [] });
  }

  const userDocs = await adminDb.getAll(...userIds.map((uid) => adminDb.collection("users").doc(uid)));
  const byId = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as Record<string, unknown>]));

  const members = snap.docs.map((d) => {
    const userId = d.data().userId as string;
    const u = byId.get(userId);
    return {
      membershipId: d.id,
      userId,
      email: String(u?.email ?? ""),
      name: String(u?.name ?? u?.email ?? userId),
      role: String(u?.role ?? "CLIENT") as UserRole,
      avatar: String(u?.avatar ?? ""),
    };
  });

  return NextResponse.json({ members: toJsonValue(members) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    userId?: unknown;
    email?: unknown;
    name?: unknown;
    company?: unknown;
    role?: unknown;
  };

  try {
    if (typeof body.userId === "string" && body.userId.trim()) {
      const userId = body.userId.trim();
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const dup = await adminDb
        .collection("projectMembers")
        .where("projectId", "==", projectId)
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (!dup.empty) {
        return NextResponse.json({ error: "User is already on this project" }, { status: 409 });
      }

      await adminDb.collection("projectMembers").doc().set({ userId, projectId });
      return NextResponse.json({ success: true, mode: "existing" });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const company = String(body.company ?? "").trim();
    const role = body.role === "ADMIN" ? "ADMIN" : "CLIENT";

    if (!email) {
      return NextResponse.json({ error: "Email is required for invites" }, { status: 400 });
    }

    const { inviteId } = await createAndEmailInvite({
      email,
      name: name || email.split("@")[0] || "User",
      company: company || "Erase Friction",
      projectIds: [projectId],
      role,
    });

    return NextResponse.json({ success: true, mode: "invite", inviteId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    const status = msg.includes("RESEND") || msg.includes("At least one project") ? 500 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
