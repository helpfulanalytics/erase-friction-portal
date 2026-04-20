"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DocCard } from "@/components/docs/DocCard";

type DocListItem = {
  id: string;
  title?: string;
  type?: string;
  status?: string;
  updatedAt?: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function ClientDocsList() {
  const [type, setType] = React.useState<string>("ALL");
  const [status, setStatus] = React.useState<string>("ALL");

  const q = useQuery({
    queryKey: ["docs", "client"],
    queryFn: () => fetchJson<{ documents: DocListItem[] }>("/api/docs"),
  });

  const docs = (q.data?.documents ?? []).filter((d) => {
    const dt = String(d.type ?? "CLIENT_VISIBLE");
    const ds = String(d.status ?? "DRAFT");
    if (type !== "ALL" && dt !== type) return false;
    if (status !== "ALL" && ds !== status) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
            Documents
          </h1>
          <p className="mt-1 font-headingAlt text-base text-muted-foreground">
            Client-visible documents shared with you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
          >
            <option value="ALL">All types</option>
            <option value="CLIENT_VISIBLE">Client visible</option>
            <option value="BRIEF">Brief</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="MEETING_NOTES">Meeting notes</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
          >
            <option value="ALL">All status</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW">Review</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : q.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(q.error as Error).message}</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-muted-foreground">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <DocCard
              key={d.id}
              id={d.id}
              title={d.title ?? "Untitled"}
              type={d.type ?? "CLIENT_VISIBLE"}
              status={d.status ?? "DRAFT"}
              updatedAt={d.updatedAt ?? null}
              mode="client"
            />
          ))}
        </div>
      )}
    </div>
  );
}

