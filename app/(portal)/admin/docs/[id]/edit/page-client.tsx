"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DocStatusBadge, DocTypeBadge } from "@/components/docs/badges";
import { type DiscussionUsersInput } from "@/components/editor/discussion-users-bootstrap";
import { PlateEditor } from "@/components/editor/plate-editor";

type DocPayload = {
  document: {
    id: string;
    projectId: string;
    title: string;
    type: string;
    status: string;
    content: unknown;
    version: number;
    updatedAt?: number;
  };
  versions: Array<{ id: string; version: number; createdAt?: number }>;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function useDebouncedCallback(fn: () => void, delayMs: number, deps: React.DependencyList) {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  React.useEffect(() => {
    const t = setTimeout(() => fnRef.current(), delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function AdminDocEditor({ docId }: { docId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["doc", docId, "admin"],
    queryFn: () => fetchJson<DocPayload>(`/api/docs/${docId}`),
  });

  const teamQ = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () =>
      fetchJson<{
        users: Array<{ id: string; name?: string; email?: string; avatar?: string }>;
      }>("/api/admin/team"),
    staleTime: 60_000,
  });

  const discussionUsers = React.useMemo((): DiscussionUsersInput | undefined => {
    const rows = teamQ.data?.users;
    if (!rows?.length) return undefined;
    const out: DiscussionUsersInput = {};
    for (const row of rows) {
      const name =
        (typeof row.name === "string" && row.name.trim()) ||
        (typeof row.email === "string" && row.email.split("@")[0]?.trim()) ||
        "User";
      out[row.id] = {
        name,
        avatar: typeof row.avatar === "string" ? row.avatar : "",
      };
    }
    return out;
  }, [teamQ.data?.users]);

  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<string>("INTERNAL");
  const [status, setStatus] = React.useState<string>("DRAFT");
  const [content, setContent] = React.useState<unknown>(null);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (!q.data?.document) return;
    setTitle(q.data.document.title);
    setType(q.data.document.type);
    setStatus(q.data.document.status);
    setContent(q.data.document.content);
    setDirty(false);
  }, [q.data?.document]);

  const autosave = useMutation({
    mutationFn: async () => {
      await fetchJson(`/api/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, status, content }),
      });
    },
    onSuccess: async () => {
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["doc", docId, "admin"] });
      toast.success("Autosaved.");
    },
  });

  // Debounced autosave every 30s after changes
  useDebouncedCallback(
    () => {
      if (!dirty) return;
      autosave.mutate();
    },
    30_000,
    [dirty, title, type, status, content]
  );

  const snapshot = useMutation({
    mutationFn: async () => {
      await fetchJson(`/api/docs/${docId}/versions`, { method: "POST" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["doc", docId, "admin"] });
      toast.success("Version snapshot created.");
    },
  });

  const requestApproval = useMutation({
    mutationFn: async () => {
      await fetchJson(`/api/docs/${docId}/request-approval`, { method: "POST" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["doc", docId, "admin"] });
      toast.success("Approval requested.");
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (q.error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <p className="font-ui text-sm text-destructive">{(q.error as Error).message}</p>
      </div>
    );
  }

  const doc = q.data!.document;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-2">
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-heading text-2xl font-extrabold tracking-tight text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <div className="flex flex-wrap items-center gap-2">
                <DocTypeBadge type={type} />
                <DocStatusBadge status={status} />
                <span className="font-ui text-xs text-muted-foreground">
                  v{doc.version}
                </span>
                {dirty ? (
                  <span className="font-ui text-xs font-semibold text-orange-700">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setDirty(true);
                }}
                className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
              >
                <option value="INTERNAL">Internal</option>
                <option value="CLIENT_VISIBLE">Client visible</option>
                <option value="BRIEF">Brief</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="MEETING_NOTES">Meeting notes</option>
              </select>

              <button
                type="button"
                onClick={() => requestApproval.mutate()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle disabled:opacity-50"
                disabled={requestApproval.isPending}
              >
                Request approval
              </button>

              <button
                type="button"
                onClick={() => snapshot.mutate()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={snapshot.isPending}
              >
                Save version
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <PlateEditor
            documentId={docId}
            value={content ?? doc.content}
            discussionUsers={discussionUsers}
            onChange={(v) => {
              setContent(v);
              setDirty(true);
            }}
          />
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="font-headingAlt text-lg font-bold text-ink">Version history</div>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Snapshots you’ve saved.
        </p>

        <div className="mt-4 space-y-2">
          {(q.data!.versions ?? []).length === 0 ? (
            <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-muted-foreground">
              No versions yet.
            </div>
          ) : (
            q.data!.versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="font-ui text-sm font-semibold text-ink">v{v.version}</div>
                <div className="font-ui text-xs text-muted-foreground">
                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

