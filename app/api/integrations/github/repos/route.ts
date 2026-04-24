export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { getGithubIntegration } from "@/lib/server/github-app";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const integration = await getGithubIntegration();
  if (!integration?.installationId) {
    return NextResponse.json({ connected: false, repos: [] });
  }

  return NextResponse.json({
    connected: true,
    repos: integration.repoAllowlist ?? [],
  });
}

