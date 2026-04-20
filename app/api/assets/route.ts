export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAssetsAdmin } from "@/lib/server/assets-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAssetsAdmin(session);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200) || 200, 1), 1000);

  let q: FirebaseFirestore.Query = adminDb.collection("assets");
  if (projectId) q = q.where("projectId", "==", projectId);

  const snap = await q.orderBy("createdAt", "desc").limit(limit).get();
  const assets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ assets: toJsonValue(assets) });
}

