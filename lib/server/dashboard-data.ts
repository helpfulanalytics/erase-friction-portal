import "server-only";

import { adminDb } from "@/lib/firebase-admin";

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function getProjectIdsForUser(userId: string): Promise<string[]> {
  const membershipsSnap = await adminDb
    .collection("projectMembers")
    .where("userId", "==", userId)
    .get();

  return membershipsSnap.docs
    .map((d) => d.data().projectId as string)
    .filter(Boolean);
}

