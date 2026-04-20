import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import type { SessionPayload } from "@/types/models";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";

export async function getDocOr404(docId: string) {
  const ref = adminDb.collection("documents").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("Not found");
    (err as { status?: number }).status = 404;
    throw err;
  }
  return { ref, id: snap.id, data: snap.data() as Record<string, unknown> };
}

export async function assertCanAccessDoc(session: SessionPayload, doc: { projectId?: unknown }) {
  const projectId = String(doc.projectId ?? "");
  if (!projectId) {
    const err = new Error("Invalid document");
    (err as { status?: number }).status = 400;
    throw err;
  }
  await assertProjectMember(session, projectId);
  return projectId;
}

export function assertDocAdmin(session: SessionPayload) {
  assertAdmin(session);
}

