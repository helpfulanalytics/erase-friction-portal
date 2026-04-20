# Erase Friction Portal — Invite-Only Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add invite-only Firebase Auth (email magic link) to the Erase Friction portal, with two roles (ADMIN/CLIENT), JWT session cookies, Next.js middleware protection, and a complete invite flow via Resend email.

**Architecture:** Admin creates an invite → Resend sends a magic link → user accepts at `/invite/[token]` → Firebase custom token exchange → session JWT cookie → middleware protects `/dashboard/*` and `/admin/*`. All Firebase Admin SDK usage is in Node.js Route Handlers; Edge middleware uses only `jose` for JWT verification.

**Tech Stack:** Next.js 15, Firebase Auth + Firestore Admin, `jose` (Edge-compatible JWT), Resend (email), TypeScript.

**Context:** Scaffold is already complete — Next.js 15.5.15, Firebase v12 client/admin, shadcn base-nova (Base UI), Tailwind 4, all portal page stubs. The build passes. This plan adds auth on top without breaking existing pages.

---

## Known Issues and Mitigations

**Firebase Admin in Edge Runtime:** `firebase-admin` throws at import in Next.js Edge (middleware). Mitigation: middleware uses only `jose.jwtVerify()`. All `adminDb`/`adminAuth` calls are in Route Handlers with `export const runtime = "nodejs"`.

**Next.js 15 async APIs:** `cookies()` is now async — must be `await cookies()`. `params` in Route Handlers is a Promise — must be `const { token } = await params`.

**Custom token lifetime:** Firebase custom tokens expire in 1 hour. The `/invite/[token]/page.tsx` flow must exchange the custom token immediately after calling `POST /api/invites/[token]/accept`.

**`server-only` guard:** `lib/firebase-admin.ts` already has `import "server-only"`. Do not import it in any file that may run in a browser or Edge context.

---

## File Structure

```
app/
├── api/
│   ├── invites/
│   │   ├── route.ts                   # POST — create invite + send email
│   │   └── [token]/
│   │       ├── route.ts               # GET — validate token, return invite data
│   │       └── accept/
│   │           └── route.ts           # POST — create Firebase user, return customToken
├── api/auth/
│   ├── session/route.ts               # POST — exchange Firebase ID token for session cookie
│   └── signout/route.ts               # POST — clear session cookie
├── invite/[token]/page.tsx            # Accept invite Client Component
├── auth/
│   ├── signin/page.tsx                # Magic link sign-in Client Component
│   └── error/page.tsx                 # Auth error page
│   (auth)/login/page.tsx              # Changed to redirect → /auth/signin
│   (portal)/layout.tsx                # Rewritten to read real session data
lib/
├── session.ts                         # jose JWT helpers
└── get-session.ts                     # Server helper — reads middleware headers
middleware.ts                          # Edge — session guard
types/models.ts                        # Extended with Invite + SessionPayload
.env.local                             # Added: INVITE_JWT_SECRET, SESSION_SECRET, RESEND_API_KEY
```

---

## Task 1 — Install Resend and Add ENV Vars

**Files:** `package.json`, `.env.local`

- [ ] **Step 1: Install resend**

```bash
cd /Users/tosin/Documents/Erase Friction/Erase Friction/document-editor && npm install resend
```

- [ ] **Step 2: Add env vars to .env.local**

Open `.env.local` and append these lines (leave values empty — user will fill them):

```
# Auth secrets
INVITE_JWT_SECRET=
SESSION_SECRET=

# Resend — transactional email
RESEND_API_KEY=
```

- [ ] **Step 3: Verify**

```bash
node -e "require('./node_modules/resend/dist/index.js'); console.log('resend OK')"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local && \
git commit -m "chore: add resend dependency and auth env vars"
```

---

## Task 2 — Extend types/models.ts

**Files:**
- Modify: `types/models.ts`

- [ ] **Step 1: Add Invite, SessionPayload, InviteTokenPayload, and invites collection key**

Replace the entire file:

```ts
import type { Timestamp } from "firebase/firestore";

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "CLIENT";

export interface User {
  email:     string;
  name:      string;
  role:      UserRole;
  company:   string;
  avatar:    string;
  createdAt: Timestamp;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface Project {
  name:        string;
  description: string;
  status:      ProjectStatus;
  createdAt:   Timestamp;
}

// ─── Project Member ──────────────────────────────────────────────────────────

export interface ProjectMember {
  userId:    string;
  projectId: string;
}

// ─── Invite ──────────────────────────────────────────────────────────────────

export interface Invite {
  email:      string;
  name:       string;
  company:    string;
  projectIds: string[];
  role:       UserRole;
  token:      string;          // signed JWT (stored for reference)
  expiresAt:  Timestamp;
  accepted:   boolean;
  createdAt:  Timestamp;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface SessionPayload {
  uid:   string;
  email: string;
  role:  UserRole;
}

export interface InviteTokenPayload {
  inviteId: string;
  email:    string;
}

// ─── Collection path constants ───────────────────────────────────────────────

export const COLLECTIONS = {
  users:          "users",
  projects:       "projects",
  projectMembers: "projectMembers",
  invites:        "invites",
} as const;
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add types/models.ts && \
git commit -m "feat: add Invite, SessionPayload, InviteTokenPayload types"
```

---

## Task 3 — lib/session.ts (JWT Helpers)

**Files:**
- Create: `lib/session.ts`

- [ ] **Step 1: Create lib/session.ts**

```ts
import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload, InviteTokenPayload } from "@/types/models";

export const SESSION_COOKIE_NAME    = "Erase Friction_session";
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/session.ts && \
git commit -m "feat: add jose JWT helpers for session and invite tokens"
```

---

## Task 4 — API: Create Invite + Validate Invite

**Files:**
- Create: `app/api/invites/route.ts`
- Create: `app/api/invites/[token]/route.ts`

- [ ] **Step 1: Create app/api/invites/route.ts**

```ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { signInviteToken } from "@/lib/session";
import { Resend } from "resend";
import { Timestamp } from "firebase-admin/firestore";
import type { Invite } from "@/types/models";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json() as {
    email:      string;
    name:       string;
    company:    string;
    projectIds: string[];
    role?:      "ADMIN" | "CLIENT";
  };

  // TODO: verify caller is ADMIN (add after middleware is in place)

  const inviteRef = adminDb.collection("invites").doc();
  const inviteId  = inviteRef.id;

  const token = await signInviteToken({ inviteId, email: body.email });

  const expiresAt = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);

  const invite: Invite = {
    email:      body.email,
    name:       body.name,
    company:    body.company,
    projectIds: body.projectIds ?? [],
    role:       body.role ?? "CLIENT",
    token,
    expiresAt,
    accepted:   false,
    createdAt:  Timestamp.now(),
  };

  await inviteRef.set(invite);

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`;

  await resend.emails.send({
    from:    "Erase Friction <noreply@Erase Friction.com>",
    to:      body.email,
    subject: "You've been invited to Erase Friction",
    html: `
      <p>Hi ${body.name},</p>
      <p>You've been invited to access the Erase Friction client portal.</p>
      <p><a href="${acceptUrl}" style="background:#B9FF66;color:#09090b;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invite</a></p>
      <p>This link expires in 72 hours.</p>
    `,
  });

  return NextResponse.json({ success: true, inviteId });
}
```

- [ ] **Step 2: Create app/api/invites/[token]/route.ts**

```ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyInviteToken } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = await verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const doc = await adminDb.collection("invites").doc(payload.inviteId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = doc.data();
  if (invite?.accepted) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
  }

  return NextResponse.json({
    inviteId: payload.inviteId,
    email:    invite?.email,
    name:     invite?.name,
    company:  invite?.company,
  });
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/invites" && \
git commit -m "feat: add POST /api/invites and GET /api/invites/[token] route handlers"
```

---

## Task 5 — API: Accept Invite

**Files:**
- Create: `app/api/invites/[token]/accept/route.ts`

- [ ] **Step 1: Create app/api/invites/[token]/accept/route.ts**

```ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyInviteToken } from "@/lib/session";
import { Timestamp } from "firebase-admin/firestore";
import type { User, ProjectMember } from "@/types/models";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { name }  = await request.json() as { name: string };

  const payload = await verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const inviteRef = adminDb.collection("invites").doc(payload.inviteId);
  const inviteDoc = await inviteRef.get();
  if (!inviteDoc.exists) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteDoc.data()!;
  if (invite.accepted) {
    return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  }

  // Create Firebase Auth user
  const userRecord = await adminAuth.createUser({
    email:       invite.email,
    displayName: name,
  });

  // Set custom claims for role
  await adminAuth.setCustomUserClaims(userRecord.uid, { role: invite.role });

  // Write Firestore user doc
  const userDoc: User = {
    email:     invite.email,
    name,
    role:      invite.role,
    company:   invite.company,
    avatar:    "",
    createdAt: Timestamp.now(),
  };
  await adminDb.collection("users").doc(userRecord.uid).set(userDoc);

  // Write projectMembers docs
  const batch = adminDb.batch();
  for (const projectId of (invite.projectIds as string[])) {
    const memberRef = adminDb.collection("projectMembers").doc();
    const member: ProjectMember = { userId: userRecord.uid, projectId };
    batch.set(memberRef, member);
  }
  await batch.commit();

  // Mark invite as accepted
  await inviteRef.update({ accepted: true });

  // Return custom token for client to exchange
  const customToken = await adminAuth.createCustomToken(userRecord.uid);

  return NextResponse.json({ customToken });
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/invites/[token]/accept" && \
git commit -m "feat: add POST /api/invites/[token]/accept route handler"
```

---

## Task 6 — API: Session Exchange and Sign-Out

**Files:**
- Create: `app/api/auth/session/route.ts`
- Create: `app/api/auth/signout/route.ts`

- [ ] **Step 1: Create app/api/auth/session/route.ts**

```ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/session";
import type { UserRole } from "@/types/models";

export async function POST(request: Request) {
  const { idToken } = await request.json() as { idToken: string };

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  // Fetch role from Firestore (custom claims may lag on first sign-in)
  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const role = (userDoc.data()?.role ?? "CLIENT") as UserRole;

  const sessionToken = await signSessionToken({
    uid:   decodedToken.uid,
    email: decodedToken.email ?? "",
    role,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   SESSION_COOKIE_MAX_AGE,
    path:     "/",
  });

  return response;
}
```

- [ ] **Step 2: Create app/api/auth/signout/route.ts**

```ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });
  return response;
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/auth" && \
git commit -m "feat: add POST /api/auth/session and POST /api/auth/signout route handlers"
```

---

## Task 7 — middleware.ts (Edge Session Guard)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "Erase Friction_session";

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const signinUrl = new URL("/auth/signin", request.url);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  let payload: { uid: string; email: string; role: string };
  try {
    const { payload: p } = await jwtVerify(token, sessionKey());
    payload = p as typeof payload;
  } catch {
    const signinUrl = new URL("/auth/signin", request.url);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Pass session data to server components via headers
  const response = NextResponse.next();
  response.headers.set("x-session-uid",   payload.uid);
  response.headers.set("x-session-email", payload.email);
  response.headers.set("x-session-role",  payload.role);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts && \
git commit -m "feat: add Edge middleware for session guard on /dashboard and /admin routes"
```

---

## Task 8 — lib/get-session.ts (Server Helper)

**Files:**
- Create: `lib/get-session.ts`

- [ ] **Step 1: Create lib/get-session.ts**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/get-session.ts && \
git commit -m "feat: add getSession() server helper reading middleware headers"
```

---

## Task 9 — Accept Invite Page

**Files:**
- Create: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Create app/invite/[token]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { signInWithCustomToken, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Stage = "loading" | "form" | "accepting" | "error";

export default function AcceptInvitePage() {
  const { token }              = useParams<{ token: string }>();
  const router                 = useRouter();
  const [stage, setStage]      = useState<Stage>("loading");
  const [name, setName]        = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStage("error");
        } else {
          setInviteEmail(data.email);
          setName(data.name ?? "");
          setStage("form");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load invite.");
        setStage("error");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStage("accepting");

    try {
      // 1. Accept invite — creates Firebase user, returns custom token
      const acceptRes = await fetch(`/api/invites/${token}/accept`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const { customToken, error } = await acceptRes.json();
      if (error) throw new Error(error);

      // 2. Sign in with custom token
      const credential = await signInWithCustomToken(auth, customToken);

      // 3. Get ID token and exchange for session cookie
      const idToken = await getIdToken(credential.user);
      await fetch("/api/auth/session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idToken }),
      });

      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="font-ui text-sm text-muted-foreground">Validating invite…</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
          <p className="font-ui text-sm text-destructive">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
            <span className="text-xs font-bold text-ink">N</span>
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-ink">
            Erase Friction
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-ink">Accept your invite</h1>
        <p className="mb-6 font-ui text-sm text-muted-foreground">
          You&apos;re joining as <strong className="text-ink">{inviteEmail}</strong>. Confirm your name to get started.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="font-ui text-xs font-medium text-ink">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <button
            type="submit"
            disabled={stage === "accepting"}
            className="mt-1 h-11 w-full cursor-pointer rounded-lg bg-brand font-ui text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            {stage === "accepting" ? "Setting up your account…" : "Accept invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/invite" && \
git commit -m "feat: add /invite/[token] accept invite page"
```

---

## Task 10 — Auth Pages: Sign-In, Error, Login Redirect

**Files:**
- Create: `app/auth/signin/page.tsx`
- Create: `app/auth/error/page.tsx`
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create app/auth/signin/page.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type Stage = "idle" | "sending" | "sent" | "verifying" | "error";

export default function SignInPage() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const callbackUrl    = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Handle email link callback
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    const storedEmail = window.localStorage.getItem("Erase Friction_signin_email");
    if (!storedEmail) {
      setErrorMsg("Email not found. Please request a new sign-in link.");
      setStage("error");
      return;
    }

    setStage("verifying");
    signInWithEmailLink(auth, storedEmail, window.location.href)
      .then(async (credential) => {
        window.localStorage.removeItem("Erase Friction_signin_email");
        const idToken = await getIdToken(credential.user);
        await fetch("/api/auth/session", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ idToken }),
        });
        router.push(callbackUrl);
      })
      .catch((err) => {
        setErrorMsg(err.message ?? "Sign-in failed.");
        setStage("error");
      });
  }, [callbackUrl, router]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStage("sending");

    try {
      await sendSignInLinkToEmail(auth, email, {
        url:             `${window.location.origin}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem("Erase Friction_signin_email", email);
      setStage("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send link.");
      setStage("error");
    }
  }

  if (stage === "verifying") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="font-ui text-sm text-muted-foreground">Signing you in…</p>
      </div>
    );
  }

  if (stage === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
              <span className="text-xs font-bold text-ink">N</span>
            </div>
            <span className="font-heading font-extrabold text-lg tracking-tight text-ink">
              Erase Friction
            </span>
          </div>
          <h1 className="mb-1 text-xl font-bold text-ink">Check your email</h1>
          <p className="font-ui text-sm text-muted-foreground">
            We sent a sign-in link to <strong className="text-ink">{email}</strong>.
            Click it to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
            <span className="text-xs font-bold text-ink">N</span>
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-ink">
            Erase Friction
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-ink">Welcome back</h1>
        <p className="mb-6 font-ui text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a sign-in link.
        </p>

        {stage === "error" && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 font-ui text-sm text-destructive">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSendLink} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-ui text-xs font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <button
            type="submit"
            disabled={stage === "sending"}
            className="mt-1 h-11 w-full cursor-pointer rounded-lg bg-brand font-ui text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            {stage === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/auth/error/page.tsx**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Auth Error — Erase Friction" };

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
            <span className="text-xs font-bold text-ink">N</span>
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-ink">
            Erase Friction
          </span>
        </div>
        <h1 className="mb-1 text-xl font-bold text-ink">Authentication error</h1>
        <p className="mb-6 font-ui text-sm text-muted-foreground">
          Something went wrong with your sign-in. Please try again.
        </p>
        <Link
          href="/auth/signin"
          className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-brand font-ui text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update app/(auth)/login/page.tsx to redirect**

```tsx
import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/auth/signin");
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "app/auth" "app/(auth)/login/page.tsx" && \
git commit -m "feat: add /auth/signin magic link page, /auth/error page, redirect /login"
```

---

## Task 11 — Rewrite Portal Layout with Real Session Data

**Files:**
- Modify: `app/(portal)/layout.tsx`

- [ ] **Step 1: Rewrite app/(portal)/layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { adminDb } from "@/lib/firebase-admin";
import PortalNav from "@/components/layout/PortalNav";
import Sidebar from "@/components/layout/Sidebar";
import type { User, Project } from "@/types/models";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  // Fetch user profile
  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  const user    = userDoc.data() as User | undefined;

  // Fetch project memberships
  const membershipsSnap = await adminDb
    .collection("projectMembers")
    .where("userId", "==", session.uid)
    .get();

  const projectIds = membershipsSnap.docs.map((d) => d.data().projectId as string);

  // Fetch project names (batch — up to 30 IDs)
  let projects: { id: string; name: string }[] = [];
  if (projectIds.length > 0) {
    const projectDocs = await adminDb.getAll(
      ...projectIds.map((id) => adminDb.collection("projects").doc(id))
    );
    projects = projectDocs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, name: (d.data() as Project).name }));
  }

  return (
    <div className="min-h-screen bg-page">
      <PortalNav
        projects={projects}
        activeProjectId={projects[0]?.id}
        userName={user?.name ?? session.email}
        userAvatar={user?.avatar}
      />
      <div className="flex pt-14">
        <Sidebar role={session.role} />
        <main className="flex-1 pl-14 md:pl-[248px]">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/(portal)/layout.tsx" && \
git commit -m "feat: rewrite portal layout to use real session + Firestore data"
```

---

## Task 12 — Firebase Console and .env.local Notes

This task is manual configuration, not code. Document for the developer.

- [ ] **Step 1: Enable Email Link auth in Firebase Console**

  1. Firebase Console → Authentication → Sign-in method
  2. Enable **Email/Password**
  3. Under Email/Password, also enable **Email link (passwordless sign-in)**

- [ ] **Step 2: Add authorized domains**

  Firebase Console → Authentication → Settings → Authorized domains:
  - `localhost`
  - `clients.Erase Friction.co`

- [ ] **Step 3: Create Firestore security rules**

  Firebase Console → Firestore → Rules:

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Users can read their own doc
      match /users/{uid} {
        allow read: if request.auth.uid == uid;
        allow write: if false; // server only
      }
      // Project members can read their projects
      match /projects/{projectId} {
        allow read: if request.auth != null &&
          exists(/databases/$(database)/documents/projectMembers/$(request.auth.uid + "_" + projectId));
        allow write: if false;
      }
      // Server-side only
      match /invites/{inviteId} {
        allow read, write: if false;
      }
      match /projectMembers/{memberId} {
        allow read: if false;
        allow write: if false;
      }
    }
  }
  ```

- [ ] **Step 4: Fill in .env.local values**

  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase console>
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<number>
  NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>

  FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@<project>.iam.gserviceaccount.com

  INVITE_JWT_SECRET=<random 32+ char string>
  SESSION_SECRET=<random 32+ char string>
  RESEND_API_KEY=re_...

  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```

- [ ] **Step 5: Final build verification**

```bash
cd /Users/tosin/Documents/Erase Friction/Erase Friction/document-editor && \
npx tsc --noEmit && npm run build
```

Expected: zero TypeScript errors, build completes with all routes listed.

---

## Commit Sequence Summary

| Task | Commit message |
|------|----------------|
| 1    | `chore: add resend dependency and auth env vars` |
| 2    | `feat: add Invite, SessionPayload, InviteTokenPayload types` |
| 3    | `feat: add jose JWT helpers for session and invite tokens` |
| 4    | `feat: add POST /api/invites and GET /api/invites/[token] route handlers` |
| 5    | `feat: add POST /api/invites/[token]/accept route handler` |
| 6    | `feat: add POST /api/auth/session and POST /api/auth/signout route handlers` |
| 7    | `feat: add Edge middleware for session guard on /dashboard and /admin routes` |
| 8    | `feat: add getSession() server helper reading middleware headers` |
| 9    | `feat: add /invite/[token] accept invite page` |
| 10   | `feat: add /auth/signin magic link page, /auth/error page, redirect /login` |
| 11   | `feat: rewrite portal layout to use real session + Firestore data` |
| 12   | Manual: Firebase Console config + fill .env.local values |
