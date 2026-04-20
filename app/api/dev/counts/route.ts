export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";

const COLLECTIONS = [
  "users",
  "projects",
  "projectMembers",
  "documents",
  "invoices",
  "assets",
  "messages",
  "timeEntries",
  "invites",
  "milestones",
  "notifications",
] as const;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const counts: Record<string, number> = {};

  await Promise.all(
    COLLECTIONS.map(async (col) => {
      const snap = await adminDb.collection(col).count().get();
      counts[col] = snap.data().count;
    })
  );

  return NextResponse.json(counts);
}
