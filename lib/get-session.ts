import { headers } from "next/headers";
import type { SessionPayload, UserRole } from "@/types/models";

/**
 * Read the session from middleware-injected request headers.
 * Only call this from Server Components or Route Handlers that are
 * behind the middleware matcher (i.e., /dashboard/* or /admin/*).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const headersList = await headers();
  const uid   = headersList.get("x-session-uid");
  const email = headersList.get("x-session-email");
  const role  = headersList.get("x-session-role") as UserRole | null;

  if (!uid || !email || !role) return null;

  return { uid, email, role };
}
