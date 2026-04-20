export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertProjectMember } from "@/lib/server/project-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";
import { createNotification } from "@/lib/server/notifications";
import { logActivity } from "@/lib/server/activity-events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  await assertProjectMember(session, projectId);

  const snap = await adminDb
    .collection("messages")
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "asc")
    .limit(500)
    .get();

  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ messages: toJsonValue(messages) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  await assertProjectMember(session, projectId);

  const body = (await request.json()) as { body?: string };
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  const now = Timestamp.now();
  const msgRef = await adminDb.collection("messages").add({
    projectId,
    userId: session.uid,
    userRole: session.role,
    body: text,
    createdAt: now,
  });

  const membersSnap = await adminDb
    .collection("projectMembers")
    .where("projectId", "==", projectId)
    .get();

  const recipients = membersSnap.docs
    .map((d) => d.data().userId as string)
    .filter((uid) => uid && uid !== session.uid);

  await Promise.all(
    recipients.map((uid) =>
      createNotification({
        userId: uid,
        type: "MESSAGE_RECEIVED",
        title: "New message",
        body: text.length > 80 ? `${text.slice(0, 77)}…` : text,
        link: `/dashboard/messages?projectId=${encodeURIComponent(projectId)}`,
        meta: { projectId, messageId: msgRef.id },
      })
    )
  );

  await logActivity({
    projectId,
    session,
    type: "message.sent",
    description: "sent a message",
    meta: { messageId: msgRef.id },
  });

  return NextResponse.json({ success: true, id: msgRef.id });
}

