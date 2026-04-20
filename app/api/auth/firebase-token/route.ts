export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customToken = await adminAuth.createCustomToken(session.uid, {
    role: session.role,
  });

  return NextResponse.json({ token: customToken });
}
