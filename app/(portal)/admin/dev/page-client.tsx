"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import NotificationMynaui2 from "@/components/notification2";
import NotificationMynaui3 from "@/components/notification3";
import NotificationMynaui4 from "@/components/notification4";
import NotificationMynaui5 from "@/components/notification5";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

type CollectionCounts = {
  users: number;
  projects: number;
  projectMembers: number;
  documents: number;
  invoices: number;
  assets: number;
  messages: number;
  timeEntries: number;
  invites: number;
  milestones: number;
  notifications: number;
};

export default function AdminDevSeedClient() {
  const router = useRouter();
  const qc = useQueryClient();

  // ─── Seed sample project ─────────────────────────────────────────
  const [seedResult, setSeedResult] = React.useState<{
    projectId?: string;
    documentId?: string;
  } | null>(null);

  const seed = useMutation({
    mutationFn: () => fetchJson<{ success: boolean; projectId?: string; documentId?: string }>("/api/dev/seed-sample", { method: "POST" }),
    onSuccess: (data) => {
      setSeedResult({ projectId: data.projectId, documentId: data.documentId });
      toast.success("Sample project and document created.");
      qc.invalidateQueries({ queryKey: ["dev"] });
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Seeding failed"),
  });

  // ─── Make admin ──────────────────────────────────────────────────
  const [adminEmail, setAdminEmail] = React.useState("");
  const [adminName, setAdminName] = React.useState("");

  const makeAdmin = useMutation({
    mutationFn: () =>
      fetchJson<{ success: boolean; uid: string }>("/api/dev/make-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, name: adminName }),
      }),
    onSuccess: (data) => {
      toast.success(`Admin created: ${adminEmail} (uid: ${data.uid})`);
      setAdminEmail("");
      setAdminName("");
      qc.invalidateQueries({ queryKey: ["dev"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // ─── Collection counts ───────────────────────────────────────────
  const countsQ = useQuery({
    queryKey: ["dev", "counts"],
    queryFn: () => fetchJson<CollectionCounts>("/api/dev/counts"),
  });

  // ─── Env check ───────────────────────────────────────────────────
  const envQ = useQuery({
    queryKey: ["dev", "env"],
    queryFn: () => fetchJson<{ vars: Record<string, boolean> }>("/api/dev/env-check"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink">
          Dev Panel
        </h1>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Development tools for seeding data, managing roles, and inspecting state.
          Only available in non-production environments.
        </p>
      </div>

      {/* Environment variables */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-headingAlt text-base font-bold text-ink">Environment check</h2>
        <p className="mt-1 font-ui text-xs text-muted-foreground">
          Whether required env vars are set (values are not exposed).
        </p>
        {envQ.isLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-60" />
          </div>
        ) : envQ.error ? (
          <div className="mt-3 font-ui text-sm text-destructive">{(envQ.error as Error).message}</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {Object.entries(envQ.data?.vars ?? {}).map(([key, isSet]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg px-2 py-1">
                <span
                  className={cn(
                    "inline-block size-2 rounded-full",
                    isSet ? "bg-emerald-500" : "bg-red-500"
                  )}
                />
                <span className="font-mono text-xs text-ink">{key}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Collection counts */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-headingAlt text-base font-bold text-ink">Firestore collections</h2>
        <p className="mt-1 font-ui text-xs text-muted-foreground">
          Document counts across all collections.
        </p>
        {countsQ.isLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : countsQ.error ? (
          <div className="mt-3 font-ui text-sm text-destructive">{(countsQ.error as Error).message}</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(countsQ.data ?? {}).map(([col, count]) => (
              <div
                key={col}
                className="rounded-lg border border-border bg-subtle px-3 py-2"
              >
                <div className="font-heading text-xl font-extrabold text-ink">
                  {count as number}
                </div>
                <div className="font-ui text-[11px] text-muted-foreground">{col}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seed sample */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-headingAlt text-base font-bold text-ink">Seed sample data</h2>
        <p className="mt-1 font-ui text-xs text-muted-foreground">
          Creates a sample project, adds you as a member, and seeds a client-visible document.
        </p>
        <button
          type="button"
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-70"
        >
          {seed.isPending ? "Seeding..." : "Seed sample project + doc"}
        </button>
        {seedResult?.projectId && (
          <div className="mt-3 space-y-1 font-ui text-sm text-muted-foreground">
            <div>
              Project:{" "}
              <span className="font-mono text-xs text-ink">{seedResult.projectId}</span>
            </div>
            {seedResult.documentId && (
              <div>
                Document:{" "}
                <span className="font-mono text-xs text-ink">{seedResult.documentId}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Mynaui notification blocks (shadcn registry) */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-headingAlt text-base font-bold text-ink">Notification UI samples</h2>
        <p className="mt-1 font-ui text-xs text-muted-foreground">
          Mynaui registry components added via{" "}
          <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[11px]">shadcn add</code>.
        </p>
        <div className="mt-4 flex flex-col items-start gap-4">
          <NotificationMynaui2 />
          <NotificationMynaui3 />
          <NotificationMynaui4 />
          <NotificationMynaui5 />
        </div>
      </section>

      {/* Make admin */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-headingAlt text-base font-bold text-ink">Make admin user</h2>
        <p className="mt-1 font-ui text-xs text-muted-foreground">
          Create or promote a user to ADMIN role. Skips the invite flow.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            makeAdmin.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <button
            type="submit"
            disabled={!adminEmail.trim() || makeAdmin.isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-500 px-4 font-ui text-sm font-semibold text-white disabled:opacity-50"
          >
            {makeAdmin.isPending ? "Creating..." : "Make admin"}
          </button>
        </form>
      </section>
    </div>
  );
}
