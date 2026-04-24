export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { getGithubIntegration } from "@/lib/server/github-app";
import { toJsonValue } from "@/lib/server/firestore-serialize";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const integration = await getGithubIntegration();
  return NextResponse.json({
    connected: Boolean(integration?.installationId),
    integration: toJsonValue(integration),
  });
}

