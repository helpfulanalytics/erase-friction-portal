"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type Stage = "idle" | "sending" | "sent" | "verifying" | "error";

export default function SignInClient() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/dashboard",
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setStage("sending");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackUrl }),
      });

      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send link.");
      }

      setStage("sent");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send link.");
      setStage("error");
    }
  }

  if (stage === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-card">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="shrink-0 inline-flex items-center justify-center h-10 w-10 border-2 border-ink rounded-xl bg-brand shadow-[4px_4px_0_0_#000]">
              <Image src="/logo-black.svg" alt="Nadiron" width={28} height={28} />
            </span>
            <span className="font-heading font-bold text-2xl tracking-tighter text-ink leading-none">
              Nadiron
            </span>
          </div>
          <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Check your email</h1>
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
          <span className="shrink-0 inline-flex items-center justify-center h-10 w-10 border-2 border-ink rounded-xl bg-brand shadow-[4px_4px_0_0_#000]">
            <Image src="/logo-black.svg" alt="Nadiron" width={28} height={28} />
          </span>
          <span className="font-heading font-bold text-2xl tracking-tighter text-ink leading-none">
            Nadiron
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Welcome back</h1>
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

          <Link
            href="/invite"
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent font-ui text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
          >
            Sign up
          </Link>
        </form>
      </div>
    </div>
  );
}

