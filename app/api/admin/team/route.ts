export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const membersSnap = await adminDb.collection("projectMembers").get();
  const userIds = Array.from(
    new Set(membersSnap.docs.map((d) => d.data().userId as string).filter(Boolean))
  );

  const usersDocs = userIds.length
    ? await adminDb.getAll(...userIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const users = usersDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  const projectsSnap = await adminDb.collection("projects").get();
  const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  return NextResponse.json({ users: toJsonValue(users), projects: toJsonValue(projects) });
}

