export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/session";
import type { UserRole } from "@/types/models";

export async function POST(request: Request) {
  const { idToken } = await request.json() as { idToken: string };

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  // Fetch role from Firestore (custom claims may lag on first sign-in)
  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const role = (userDoc.data()?.role ?? "CLIENT") as UserRole;

  const sessionToken = await signSessionToken({
    uid:   decodedToken.uid,
    email: decodedToken.email ?? "",
    role,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   SESSION_COOKIE_MAX_AGE,
    path:     "/",
  });

  return response;
}
