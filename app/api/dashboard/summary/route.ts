export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { chunk, getProjectIdsForUser } from "@/lib/server/dashboard-data";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  const user = userDoc.data() ?? null;

  const projectIds = await getProjectIdsForUser(session.uid);

  // Compute lightweight counts for stat cards.
  let milestoneTotal = 0;
  let milestoneCompleted = 0;

  let documentsCount = 0;
  let pendingApproval = 0;

  for (const group of chunk(projectIds, 10)) {
    const msSnap = await adminDb
      .collection("milestones")
      .where("projectId", "in", group)
      .get();

    milestoneTotal += msSnap.size;
    for (const doc of msSnap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const percent = typeof d.percentComplete === "number" ? d.percentComplete : (Boolean(d.completed) ? 100 : 0);
      if (percent >= 100) milestoneCompleted += 1;
    }

    const docSnap = await adminDb
      .collection("documents")
      .where("projectId", "in", group)
      .where("type", "==", "CLIENT_VISIBLE")
      .get();

    documentsCount += docSnap.size;
    for (const doc of docSnap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const status = String(d.status ?? "").toUpperCase();
      if (status === "REVIEW") pendingApproval += 1;
    }
  }

  const stats = {
    milestones: { completed: milestoneCompleted, total: milestoneTotal },
    openTasks: { count: 0, dueThisWeek: 0 },
    documents: { count: documentsCount, pendingApproval },
    unreadMessages: 0,
  };

  return NextResponse.json({
    user: toJsonValue(user),
    session,
    today: new Date().toISOString(),
    projectIds,
    stats,
  });
}

