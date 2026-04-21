import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import type { SessionPayload } from "@/types/models";

export async function assertProjectMember(session: SessionPayload, projectId: string) {
  const snap = await adminDb
    .collection("projectMembers")
    .where("userId", "==", session.uid)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();

  if (snap.empty) {
    const err = new Error("Forbidden");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

/**
 * Same as {@link assertProjectMember}, but **ADMIN** and **DEV** may access any project
 * (admin UI) without a `projectMembers` row. Clients must still be members.
 */
export async function assertProjectMemberOrStaff(session: SessionPayload, projectId: string) {
  if (session.role === "ADMIN" || session.role === "DEV") return;
  await assertProjectMember(session, projectId);
}

export function assertAdmin(session: SessionPayload) {
  if (session.role !== "ADMIN") {
    const err = new Error("Forbidden");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

export function assertAdminOrDev(session: SessionPayload) {
  if (session.role !== "ADMIN" && session.role !== "DEV") {
    const err = new Error("Forbidden");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

