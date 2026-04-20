import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nadiron_session";

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

  // Dev routes — accessible by DEV and ADMIN
  if (pathname.startsWith("/dev") && payload.role !== "DEV" && payload.role !== "ADMIN") {
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
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/docs/:path*",
    "/messages/:path*",
    "/invoices/:path*",
    "/assets/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/dev/:path*",
  ],
};
