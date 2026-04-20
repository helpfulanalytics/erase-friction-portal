"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
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
      const acceptRes = await fetch(`/api/invites/${token}/accept`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const { customToken, error } = await acceptRes.json();
      if (error) throw new Error(error);

      const credential = await signInWithCustomToken(auth, customToken);
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
          <span className="shrink-0 inline-flex items-center justify-center h-10 w-10 border-2 border-ink rounded-xl bg-brand shadow-[4px_4px_0_0_#000]">
            <Image src="/logo-black.svg" alt="Nadiron" width={28} height={28} />
          </span>
          <span className="font-heading font-bold text-2xl tracking-tighter text-ink leading-none">
            Nadiron
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Accept your invite</h1>
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
