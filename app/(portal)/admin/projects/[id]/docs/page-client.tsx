"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocCard } from "@/components/docs/DocCard";
import { Skeleton } from "@/components/ui/skeleton";

type DocListItem = {
  id: string;
  title?: string;
  type?: string;
  status?: string;
  updatedAt?: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function AdminProjectDocs({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");

  const q = useQuery({
    queryKey: ["docs", "project", projectId, "admin"],
    queryFn: () => fetchJson<{ documents: DocListItem[] }>(`/api/projects/${projectId}/docs?scope=all`),
  });

  const create = useMutation({
    mutationFn: async () => {
      await fetchJson("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: title || "Untitled", type: "INTERNAL" }),
      });
    },
    onSuccess: async () => {
      setTitle("");
      await qc.invalidateQueries({ queryKey: ["docs", "project", projectId, "admin"] });
      toast.success("Document created.");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headingAlt text-2xl font-bold text-ink">Project documents</h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Manage docs for this project.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-64 max-w-[60vw] rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="New doc title"
          />
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "New doc"}
          </button>
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
      ) : (q.data?.documents?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-muted-foreground">No documents yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {q.data!.documents.map((d) => (
            <DocCard
              key={d.id}
              id={d.id}
              title={d.title ?? "Untitled"}
              type={d.type ?? "INTERNAL"}
              status={d.status ?? "DRAFT"}
              updatedAt={d.updatedAt ?? null}
              mode="admin"
            />
          ))}
        </div>
      )}
    </div>
  );
}

