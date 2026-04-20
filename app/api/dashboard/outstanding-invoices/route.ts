export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { chunk, getProjectIdsForUser } from "@/lib/server/dashboard-data";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

const OPEN_STATUSES = ["PENDING", "OVERDUE"] as const;

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectIds = await getProjectIdsForUser(session.uid);
  if (projectIds.length === 0) return NextResponse.json({ invoices: [] });

  const invoices: { id: string; [k: string]: unknown }[] = [];

  // Firestore 'in' can take at most 10 values. We'll query status separately to keep each query simple.
  for (const group of chunk(projectIds, 10)) {
    for (const status of OPEN_STATUSES) {
      const snap = await adminDb
        .collection("invoices")
        .where("projectId", "in", group)
        .where("status", "==", status)
        .get();
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const num = String(data.number ?? data.invoiceNumber ?? "");
        invoices.push({ id: d.id, ...data, invoiceNumber: num });
      }
    }
  }

  return NextResponse.json({ invoices: toJsonValue(invoices) });
}

