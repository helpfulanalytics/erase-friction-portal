import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import type { SessionPayload } from "@/types/models";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";

export async function assertCanAccessProjectAssets(session: SessionPayload, projectId: string) {
  await assertProjectMember(session, projectId);
}

export function assertAssetsAdmin(session: SessionPayload) {
  assertAdmin(session);
}

export async function getAssetOr404(assetId: string) {
  const ref = adminDb.collection("assets").doc(assetId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("Not found");
    (err as { status?: number }).status = 404;
    throw err;
  }
  return { ref, id: snap.id, data: snap.data() as Record<string, unknown> };
}

