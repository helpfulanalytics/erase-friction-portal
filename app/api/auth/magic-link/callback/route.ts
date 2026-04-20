export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { signSessionToken, SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME, verifyMagicLinkToken } from "@/lib/session";
import type { UserRole } from "@/types/models";

function safeRedirectPath(path: string | null): string {
  if (!path) return "/dashboard";
  if (!path.startsWith("/")) return "/dashboard";
  if (path.startsWith("//")) return "/dashboard";
  return path;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const callbackUrl = safeRedirectPath(url.searchParams.get("callbackUrl"));

  if (!token) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const payload = await verifyMagicLinkToken(token);
  if (!payload?.email) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const usersSnap = await adminDb
    .collection("users")
    .where("email", "==", payload.email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const userDoc = usersSnap.docs[0]!;
  const userData = userDoc.data() as { role?: UserRole; email?: string };
  const role = (userData.role ?? "CLIENT") as UserRole;

  const sessionToken = await signSessionToken({
    uid: userDoc.id,
    email: payload.email,
    role,
  });

  const response = NextResponse.redirect(new URL(callbackUrl, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

