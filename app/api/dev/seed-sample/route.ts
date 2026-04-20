export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import type { Document, Project } from "@/types/models";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const now = Timestamp.now();

  // 1) Ensure there is a sample project
  const projectsCol = adminDb.collection("projects");
  const existingSnap = await projectsCol
    .where("name", "==", "Sample Project")
    .limit(1)
    .get();

  let projectId: string;

  if (existingSnap.empty) {
    const projectRef = projectsCol.doc();
    const project: Project = {
      name: "Sample Project",
      description: "Example project seeded for local development.",
      status: "ACTIVE",
      createdAt: now,
    };
    await projectRef.set(project);
    projectId = projectRef.id;
  } else {
    projectId = existingSnap.docs[0]!.id;
  }

  // 2) Ensure the current user is a member of that project
  const membersCol = adminDb.collection("projectMembers");
  const membershipSnap = await membersCol
    .where("userId", "==", session.uid)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();

  if (membershipSnap.empty) {
    await membersCol.add({
      userId: session.uid,
      projectId,
    });
  }

  // 3) Create a client-visible sample document if none exists yet for this project
  const docsCol = adminDb.collection("documents");
  const existingDocSnap = await docsCol
    .where("projectId", "==", projectId)
    .where("type", "==", "CLIENT_VISIBLE")
    .limit(1)
    .get();

  let documentId: string | null = null;

  if (existingDocSnap.empty) {
    const docRef = docsCol.doc();
    const doc: Document = {
      projectId,
      title: "Welcome to Erase Friction",
      type: "CLIENT_VISIBLE",
      status: "REVIEW",
      version: 1,
      content: {
        type: "p",
        children: [
          {
            text: "This is a sample client-visible document. You can edit it from the admin editor and view/approve it from the client dashboard.",
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(doc);
    documentId = docRef.id;
  } else {
    documentId = existingDocSnap.docs[0]!.id;
  }

  return NextResponse.json({
    success: true,
    projectId,
    documentId,
  });
}

