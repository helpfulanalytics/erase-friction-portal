export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 200);

  const snap = await adminDb
    .collection("notifications")
    .where("userId", "==", session.uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ notifications: toJsonValue(notifications) });
}

