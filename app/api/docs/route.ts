export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const body = await request.json() as {
    projectId: string;
    title: string;
    type?: string;
  };

  const projectId = String(body.projectId ?? "");
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  await assertProjectMember(session, projectId);

  const now = Timestamp.now();
  const docRef = adminDb.collection("documents").doc();
  await docRef.set({
    projectId,
    title: String(body.title ?? "Untitled").trim() || "Untitled",
    content: [],
    type: body.type ?? "INTERNAL",
    status: "DRAFT",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, docId: docRef.id });
}

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (projectId) {
    // Delegate to project docs endpoint semantics by role.
    await assertProjectMember(session, projectId);
    const wantAll = url.searchParams.get("scope") === "all";
    if (wantAll) assertAdmin(session);

    const base = adminDb.collection("documents").where("projectId", "==", projectId);
    const q = wantAll ? base : base.where("type", "==", "CLIENT_VISIBLE");
    const snap = await q.orderBy("updatedAt", "desc").get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ documents: toJsonValue(docs) });
  }

  // Client list: all CLIENT_VISIBLE docs across their projects
  const memberships = await adminDb
    .collection("projectMembers")
    .where("userId", "==", session.uid)
    .get();
  const projectIds = memberships.docs.map((d) => d.data().projectId as string).filter(Boolean);

  if (projectIds.length === 0) return NextResponse.json({ documents: [] });

  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < projectIds.length; i += 10) {
    const group = projectIds.slice(i, i + 10);
    const snap = await adminDb
      .collection("documents")
      .where("projectId", "in", group)
      .where("type", "==", "CLIENT_VISIBLE")
      .orderBy("updatedAt", "desc")
      .get();
    for (const d of snap.docs) docs.push({ id: d.id, ...d.data() });
  }

  // Merge across chunks, cap to reasonable size
  docs.sort((a, b) => {
    const am = (a.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const bm = (b.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return bm - am;
  });

  return NextResponse.json({ documents: toJsonValue(docs.slice(0, 200)) });
}

