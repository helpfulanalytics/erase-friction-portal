export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await adminDb
    .collection("projectMembers")
    .where("userId", "==", session.uid)
    .get();
  const projectIds = memberships.docs.map((d) => d.data().projectId as string).filter(Boolean);
  if (projectIds.length === 0) return NextResponse.json({ projects: [] });

  const projectDocs = await adminDb.getAll(
    ...projectIds.map((id) => adminDb.collection("projects").doc(id))
  );

  const projects = projectDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  return NextResponse.json({ projects: toJsonValue(projects) });
}

