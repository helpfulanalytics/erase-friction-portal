import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = { title: "Auth Error — Nadiron" };

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="shrink-0 inline-flex items-center justify-center h-10 w-10 border-2 border-ink rounded-xl bg-brand shadow-[4px_4px_0_0_#000]">
            <Image src="/logo-black.svg" alt="Nadiron" width={28} height={28} />
          </span>
          <span className="font-heading font-bold text-2xl tracking-tighter text-ink leading-none">
            Nadiron
          </span>
        </div>
        <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Authentication error</h1>
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

