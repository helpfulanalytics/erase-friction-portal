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

  // All workspace users (not only those in `projectMembers`, or users with no project yet never appear in pickers).
  const usersSnap = await adminDb.collection("users").get();
  type UserRow = { id: string } & Record<string, unknown>;
  const users = usersSnap.docs
    .map((d): UserRow => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
    .sort((a, b) => {
      const na = String(a.name ?? a.email ?? a.id).toLowerCase();
      const nb = String(b.name ?? b.email ?? b.id).toLowerCase();
      return na.localeCompare(nb);
    });

  const projectsSnap = await adminDb.collection("projects").get();
  const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  return NextResponse.json({ users: toJsonValue(users), projects: toJsonValue(projects) });
}

