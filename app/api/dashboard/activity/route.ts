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
  if (projectIds.length === 0) return NextResponse.json({ events: [] });

  const events: { id: string; [k: string]: unknown }[] = [];
  for (const group of chunk(projectIds, 10)) {
    const snap = await adminDb
      .collection("activityEvents")
      .where("projectId", "in", group)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    for (const d of snap.docs) events.push({ id: d.id, ...d.data() });
  }

  events.sort((a, b) => {
    const am = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const bm = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return bm - am;
  });

  return NextResponse.json({ events: toJsonValue(events.slice(0, 10)) });
}

