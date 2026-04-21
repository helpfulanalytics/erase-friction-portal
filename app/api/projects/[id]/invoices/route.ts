export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertProjectMemberOrStaff } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  await assertProjectMemberOrStaff(session, projectId);

  const snap = await adminDb
    .collection("invoices")
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ invoices: toJsonValue(invoices) });
}

