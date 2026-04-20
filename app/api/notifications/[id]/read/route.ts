export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ref = adminDb.collection("notifications").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data() as { userId?: string } | undefined;
  if (data?.userId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.update({ read: true });
  return NextResponse.json({ success: true });
}

