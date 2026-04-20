import "server-only";

import { assertAdminOrDev } from "@/lib/server/project-access";
import type { SessionPayload } from "@/types/models";

export function assertAdminOnly(session: SessionPayload) {
  assertAdminOrDev(session);
}

export function parseDateYYYYMMDD(input: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function clampLimit(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

