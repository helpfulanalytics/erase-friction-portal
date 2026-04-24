export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { upsertGithubIntegration } from "@/lib/server/github-app";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const body = (await request.json()) as {
    installationId: number;
    repoAllowlist?: string[] | null;
  };

  const installationId = Number(body.installationId);
  if (!Number.isFinite(installationId) || installationId <= 0) {
    return NextResponse.json({ error: "installationId must be a positive number" }, { status: 400 });
  }

  const repoAllowlist = Array.isArray(body.repoAllowlist)
    ? [...new Set(body.repoAllowlist.map((s) => String(s ?? "").trim()).filter(Boolean))]
    : [];

  await upsertGithubIntegration({
    installationId: Math.trunc(installationId),
    repoAllowlist,
    connectedByUid: session.uid,
  });

  return NextResponse.json({ success: true });
}

