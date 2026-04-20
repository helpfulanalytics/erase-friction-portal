export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  await assertProjectMember(session, projectId);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const wantAll = scope === "all";

  const docsRef = adminDb.collection("documents").where("projectId", "==", projectId);
  const query = wantAll
    ? docsRef
    : docsRef.where("type", "==", "CLIENT_VISIBLE");

  // For safety, only admins can request all.
  if (wantAll) assertAdmin(session);

  const snap = await query.orderBy("updatedAt", "desc").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ documents: toJsonValue(docs) });
}

