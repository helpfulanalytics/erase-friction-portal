export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { createAndEmailInvite } from "@/lib/server/create-and-email-invite";
import type { UserRole } from "@/types/models";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    email: string;
    name: string;
    company: string;
    projectIds: string[];
    role?: UserRole;
  };

  try {
    const projectIds = [...new Set((body.projectIds ?? []).map((id) => String(id).trim()).filter(Boolean))];
    if (projectIds.length === 0) {
      return NextResponse.json({ error: "Select at least one project" }, { status: 400 });
    }

    const { inviteId } = await createAndEmailInvite({
      email: body.email,
      name: body.name,
      company: body.company,
      projectIds,
      role: body.role,
    });

    return NextResponse.json({ success: true, inviteId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    if (msg === "Email is required" || msg === "At least one project is required") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("RESEND_API_KEY")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
