export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const projectsSnap = await adminDb.collection("projects").orderBy("createdAt", "desc").get();
  const membersSnap = await adminDb.collection("projectMembers").get();
  const docsSnap = await adminDb.collection("documents").get();

  const membersByProject = new Map<string, number>();
  for (const d of membersSnap.docs) {
    const pid = d.data().projectId as string;
    membersByProject.set(pid, (membersByProject.get(pid) ?? 0) + 1);
  }

  const docsByProject = new Map<string, number>();
  for (const d of docsSnap.docs) {
    const pid = d.data().projectId as string;
    docsByProject.set(pid, (docsByProject.get(pid) ?? 0) + 1);
  }

  const projects = projectsSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: data.name ?? "",
      description: data.description ?? "",
      status: data.status ?? "ACTIVE",
      createdAt: data.createdAt,
      memberCount: membersByProject.get(d.id) ?? 0,
      docCount: docsByProject.get(d.id) ?? 0,
    };
  });

  return NextResponse.json({ projects: toJsonValue(projects) });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    status?: string;
  };

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  const now = Timestamp.now();
  const ref = adminDb.collection("projects").doc();
  await ref.set({
    name,
    description: (body.description ?? "").trim(),
    status: body.status ?? "ACTIVE",
    createdAt: now,
  });

  // Auto-add the creating admin as a member
  await adminDb.collection("projectMembers").add({
    userId: session.uid,
    projectId: ref.id,
  });

  return NextResponse.json({
    success: true,
    project: toJsonValue({ id: ref.id, name, description: body.description ?? "", status: body.status ?? "ACTIVE", createdAt: now, memberCount: 1, docCount: 0 }),
  });
}
