export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { chunk, getProjectIdsForUser } from "@/lib/server/dashboard-data";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

type OnboardingItem = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  completed: boolean;
  order?: number;
  dueDate?: unknown;
};

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectIds = await getProjectIdsForUser(session.uid);
  if (projectIds.length === 0) return NextResponse.json({ items: [], completedCount: 0, totalCount: 0, percent: 0 });

  const items: OnboardingItem[] = [];
  for (const group of chunk(projectIds, 10)) {
    const snap = await adminDb
      .collection("onboardingItems")
      .where("projectId", "in", group)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      items.push({
        id: doc.id,
        projectId: String(d.projectId ?? ""),
        title: String(d.title ?? ""),
        description: typeof d.description === "string" ? d.description : undefined,
        completed: Boolean(d.completed),
        order: typeof d.order === "number" ? d.order : undefined,
        dueDate: d.dueDate,
      });
    }
  }

  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalCount = items.length;
  const completedCount = items.filter((i) => i.completed).length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return NextResponse.json({
    items: toJsonValue(items),
    completedCount,
    totalCount,
    percent,
  });
}

