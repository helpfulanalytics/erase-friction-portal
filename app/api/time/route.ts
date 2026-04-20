export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOnly, clampLimit, parseDateYYYYMMDD } from "@/lib/server/time-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOnly(session);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const userId = url.searchParams.get("userId");
  const from = parseDateYYYYMMDD(url.searchParams.get("from"));
  const to = parseDateYYYYMMDD(url.searchParams.get("to"));
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 500) || 500, 1, 2000);

  let q: FirebaseFirestore.Query = adminDb.collection("timeEntries");
  if (projectId) q = q.where("projectId", "==", projectId);
  if (userId) q = q.where("userId", "==", userId);
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);

  const snap = await q.orderBy("date", "desc").orderBy("createdAt", "desc").limit(limit).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ entries: toJsonValue(entries) });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOnly(session);

  const body = (await request.json()) as {
    userId: string;
    projectId: string;
    taskId?: string | null;
    description?: string;
    startTime?: number | null; // ms
    endTime?: number | null; // ms
    duration?: number | null; // mins
    date: string; // YYYY-MM-DD
  };

  const userId = String(body.userId ?? "").trim();
  const projectId = String(body.projectId ?? "").trim();
  const date = parseDateYYYYMMDD(body.date) ?? null;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });

  const startMs = body.startTime ?? null;
  const endMs = body.endTime ?? null;
  const durationMins =
    typeof body.duration === "number"
      ? Math.max(0, Math.round(body.duration))
      : startMs && endMs
        ? Math.max(0, Math.round((endMs - startMs) / 60000))
        : 0;

  const now = Timestamp.now();
  const ref = await adminDb.collection("timeEntries").add({
    userId,
    projectId,
    taskId: body.taskId ?? null,
    description: String(body.description ?? "").trim(),
    startTime: startMs ? Timestamp.fromMillis(startMs) : null,
    endTime: endMs ? Timestamp.fromMillis(endMs) : null,
    duration: durationMins,
    date,
    createdAt: now,
  });

  return NextResponse.json({ success: true, id: ref.id });
}

