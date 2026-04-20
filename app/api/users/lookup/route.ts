export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import type { User } from "@/types/models";

const MAX_IDS = 80;

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { ids?: unknown };
  const raw = Array.isArray(body.ids) ? body.ids : [];
  const ids = [...new Set(raw.map((id) => String(id ?? "").trim()).filter(Boolean))].slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ users: {} as Record<string, { name: string; avatar: string }> });
  }

  const docs = await adminDb.getAll(...ids.map((id) => adminDb.collection("users").doc(id)));

  const users: Record<string, { name: string; avatar: string }> = {};
  for (const d of docs) {
    if (!d.exists) continue;
    const u = d.data() as User;
    const name = u.name?.trim() || u.email?.split("@")[0] || "User";
    users[d.id] = { name, avatar: u.avatar ?? "" };
  }

  return NextResponse.json({ users });
}
