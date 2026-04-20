"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function InviteEntryPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    router.push(`/invite/${encodeURIComponent(t)}`);
  }

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

        <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Sign up</h1>
        <p className="mb-6 font-ui text-sm text-muted-foreground">
          Nadiron is invite-only. Paste your invite token to continue.
        </p>

        <form onSubmit={go} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="font-ui text-xs font-medium text-ink">
              Invite token
            </label>
            <input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from invite link"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <button
            type="submit"
            disabled={!token.trim()}
            className="mt-1 h-11 w-full cursor-pointer rounded-lg bg-brand font-ui text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={() => router.push("/auth/signin")}
            className="h-11 w-full cursor-pointer rounded-lg border border-border bg-transparent font-ui text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
          >
            Already have an account? Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

