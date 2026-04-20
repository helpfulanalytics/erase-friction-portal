import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { SessionPayload } from "@/types/models";

export async function logActivity(args: {
  projectId: string;
  session: SessionPayload;
  type: string; // e.g. "doc.approved", "message.sent"
  description: string; // legacy human-readable
  meta?: Record<string, unknown>;
  documentId?: string;
}) {
  await adminDb.collection("activityEvents").add({
    projectId: args.projectId,
    userId: args.session.uid,
    meta: args.meta ?? {},
    documentId: args.documentId ?? null,
    actorName: args.session.email,
    actorEmail: args.session.email,
    type: args.type,
    description: args.description,
    createdAt: Timestamp.now(),
  });
}

// Backward compatible alias (used by existing routes)
export async function logActivityEvent(args: {
  projectId: string;
  session: SessionPayload;
  type: string;
  description: string;
  documentId?: string;
}) {
  return await logActivity({ ...args });
}

