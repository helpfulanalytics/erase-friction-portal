export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { chunk, getProjectIdsForUser } from "@/lib/server/dashboard-data";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { toJsonValue } from "@/lib/server/firestore-serialize";

type Status = "ON_TRACK" | "AT_RISK" | "BLOCKED";

function computeStatus(milestones: Array<{ status?: unknown; blocked?: unknown }>): Status {
  const statuses = milestones.map((m) => String(m.status ?? "")).map((s) => s.toUpperCase());
  if (milestones.some((m) => Boolean(m.blocked)) || statuses.includes("BLOCKED")) return "BLOCKED";
  if (statuses.includes("AT_RISK") || statuses.includes("RISK")) return "AT_RISK";
  return "ON_TRACK";
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectIds = await getProjectIdsForUser(session.uid);
  if (projectIds.length === 0) return NextResponse.json({ projects: [] });

  const milestonesByProject: Record<string, Array<{ id: string; [k: string]: unknown }>> = {};

  for (const group of chunk(projectIds, 10)) {
    const snap = await adminDb
      .collection("milestones")
      .where("projectId", "in", group)
      .get();

    for (const d of snap.docs) {
      const data = d.data();
      const projectId = String((data as { projectId?: unknown }).projectId ?? "");
      if (!projectId) continue;
      (milestonesByProject[projectId] ??= []).push({ id: d.id, ...data });
    }
  }

  const projects = Object.entries(milestonesByProject).map(([projectId, milestones]) => {
    const normalized = milestones.map((m) => {
      const percentComplete =
        typeof m.percentComplete === "number"
          ? m.percentComplete
          : Boolean(m.completed)
            ? 100
            : 0;

      return {
        id: m.id,
        title: String(m.title ?? "Milestone"),
        percentComplete: Math.max(0, Math.min(100, Math.round(percentComplete))),
        status: m.status,
      };
    });

    return {
      projectId,
      status: computeStatus(normalized),
      milestones: normalized,
    };
  });

  return NextResponse.json({ projects: toJsonValue(projects) });
}

