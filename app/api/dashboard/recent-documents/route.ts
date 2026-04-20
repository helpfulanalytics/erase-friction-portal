export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { chunk, getProjectIdsForUser } from "@/lib/server/dashboard-data";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectIds = await getProjectIdsForUser(session.uid);
  if (projectIds.length === 0) return NextResponse.json({ documents: [] });

  const docs: { id: string; [k: string]: unknown }[] = [];
  for (const group of chunk(projectIds, 10)) {
    const snap = await adminDb
      .collection("documents")
      .where("projectId", "in", group)
      .where("visibility", "==", "CLIENT_VISIBLE")
      .orderBy("updatedAt", "desc")
      .limit(5)
      .get();

    for (const d of snap.docs) docs.push({ id: d.id, ...d.data() });
  }

  // Merge across chunks and re-limit.
  docs.sort((a, b) => {
    const am = (a.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const bm = (b.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return bm - am;
  });

  return NextResponse.json({ documents: toJsonValue(docs.slice(0, 5)) });
}

