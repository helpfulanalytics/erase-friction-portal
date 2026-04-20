export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { User } from "@/types/models";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const body = await request.json() as { email: string; name?: string; company?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const users = adminDb.collection("users");
  const existing = await users.where("email", "==", email).limit(1).get();

  const now = Timestamp.now();
  const userDoc: User = {
    email,
    name: body.name?.trim() || email,
    role: "ADMIN",
    company: body.company?.trim() || "Nadiron",
    avatar: "",
    createdAt: now,
  };

  let uid: string;
  if (existing.empty) {
    const docRef = users.doc();
    uid = docRef.id;
    await docRef.set(userDoc);
  } else {
    const docRef = existing.docs[0]!.ref;
    uid = docRef.id;
    await docRef.set({ ...userDoc, createdAt: existing.docs[0]!.data().createdAt ?? now }, { merge: true });
  }

  return NextResponse.json({ success: true, uid, email, role: "ADMIN" });
}

