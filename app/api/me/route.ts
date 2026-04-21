export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import type { User, UserAvatarGender } from "@/types/models";

function parseAvatarGender(v: unknown): UserAvatarGender | undefined {
  if (v === "male" || v === "female" || v === "neutral") return v;
  return undefined;
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("users").doc(session.uid).get();
  const data = snap.exists ? (snap.data() as User) : undefined;

  const name =
    data?.name?.trim() ||
    session.email?.split("@")[0] ||
    "User";

  return NextResponse.json({
    uid: session.uid,
    email: session.email,
    name,
    avatar: data?.avatar ?? "",
    avatarGender: parseAvatarGender(data?.avatarGender),
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { avatarGender?: unknown };
  const g = body.avatarGender;
  if (g !== "male" && g !== "female" && g !== "neutral") {
    return NextResponse.json(
      { error: "avatarGender must be male, female, or neutral" },
      { status: 400 }
    );
  }

  await adminDb.collection("users").doc(session.uid).set({ avatarGender: g }, { merge: true });

  return NextResponse.json({ avatarGender: g as UserAvatarGender });
}
