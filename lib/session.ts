import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload, InviteTokenPayload, MagicLinkTokenPayload } from "@/types/models";

export const SESSION_COOKIE_NAME    = "erase_friction_session";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Session tokens ───────────────────────────────────────────────────────────

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return {
      uid:   payload.uid   as string,
      email: payload.email as string,
      role:  payload.role  as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

// ─── Invite tokens ────────────────────────────────────────────────────────────

function inviteKey(): Uint8Array {
  const secret = process.env.INVITE_JWT_SECRET;
  if (!secret) throw new Error("INVITE_JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function signInviteToken(payload: InviteTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("72h")
    .sign(inviteKey());
}

export async function verifyInviteToken(token: string): Promise<InviteTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, inviteKey());
    return {
      inviteId: payload.inviteId as string,
      email:    payload.email    as string,
    };
  } catch {
    return null;
  }
}

// ─── Magic-link sign-in tokens ────────────────────────────────────────────────

function magicLinkKey(): Uint8Array {
  const secret = process.env.MAGIC_LINK_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("MAGIC_LINK_SECRET (or SESSION_SECRET fallback) env var is not set");
  return new TextEncoder().encode(secret);
}

export async function signMagicLinkToken(payload: MagicLinkTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(magicLinkKey());
}

export async function verifyMagicLinkToken(token: string): Promise<MagicLinkTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, magicLinkKey());
    return {
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
