export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "SESSION_SECRET",
  "INVITE_TOKEN_SECRET",
  "MAGIC_LINK_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_DRIVE_FOLDER_ID",
] as const;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const vars: Record<string, boolean> = {};
  for (const key of REQUIRED_VARS) {
    vars[key] = Boolean(process.env[key]);
  }

  return NextResponse.json({ vars });
}
