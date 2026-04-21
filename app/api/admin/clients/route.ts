export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  // All users
  const usersSnap = await adminDb.collection("users").orderBy("createdAt", "desc").get();

  // All memberships to count projects per user
  const membersSnap = await adminDb.collection("projectMembers").get();
  const projectsByUser = new Map<string, string[]>();
  for (const d of membersSnap.docs) {
    const uid = d.data().userId as string;
    const pid = d.data().projectId as string;
    if (!projectsByUser.has(uid)) projectsByUser.set(uid, []);
    projectsByUser.get(uid)!.push(pid);
  }

  // Project names for display
  const projectsSnap = await adminDb.collection("projects").get();
  const projectNames = new Map<string, string>();
  for (const d of projectsSnap.docs) {
    projectNames.set(d.id, (d.data().name as string) ?? d.id);
  }

  // Pending invites
  const invitesSnap = await adminDb.collection("invites").where("accepted", "==", false).get();
  const pendingInvites = invitesSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      email: data.email ?? "",
      name: data.name ?? "",
      company: data.company ?? "",
      projectIds: data.projectIds ?? [],
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
    };
  });

  const clients = usersSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const userProjectIds = projectsByUser.get(d.id) ?? [];
    return {
      id: d.id,
      name: data.name ?? "",
      email: data.email ?? "",
      company: data.company ?? "",
      role: data.role ?? "CLIENT",
      avatar: data.avatar ?? "",
      avatarGender:
        data.avatarGender === "male" || data.avatarGender === "female" || data.avatarGender === "neutral"
          ? data.avatarGender
          : undefined,
      createdAt: data.createdAt,
      projects: userProjectIds.map((pid) => ({ id: pid, name: projectNames.get(pid) ?? pid })),
    };
  });

  return NextResponse.json({
    clients: toJsonValue(clients),
    pendingInvites: toJsonValue(pendingInvites),
  });
}
