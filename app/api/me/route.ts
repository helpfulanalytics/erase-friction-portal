export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import type { User } from "@/types/models";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("users").doc(session.uid).get();
  const data = snap.exists ? (snap.data() as User) : undefined;

  const name =
    data?.name?.trim() ||
    session.email?.split("@")[0] ||
    "User";

  return NextResponse.json({
    uid: session.uid,
    email: session.email,
    name,
    avatar: data?.avatar ?? "",
  });
}
