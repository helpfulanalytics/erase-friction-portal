import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type NotificationType =
  | "DOC_SHARED"
  | "DOC_APPROVAL_REQUESTED"
  | "DOC_APPROVED"
  | "INVOICE_SENT"
  | "MESSAGE_RECEIVED"
  | "TASK_ASSIGNED"
  | "MILESTONE_COMPLETED"
  | "ONBOARDING_STEP";

export async function createNotification(args: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  link?: string;
  meta?: Record<string, unknown>;
}) {
  await adminDb.collection("notifications").add({
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    link: args.link ?? null,
    meta: args.meta ?? {},
    read: false,
    createdAt: Timestamp.now(),
  });
}

