export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";

export async function PATCH() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("notifications")
    .where("userId", "==", session.uid)
    .where("read", "==", false)
    .limit(250)
    .get();

  const batch = adminDb.batch();
  for (const d of snap.docs) batch.update(d.ref, { read: true });
  await batch.commit();

  return NextResponse.json({ success: true, updated: snap.size });
}

