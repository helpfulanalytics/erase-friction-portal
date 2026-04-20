"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Skeleton } from "@/components/ui/skeleton";
import { DocStatusBadge, DocTypeBadge } from "@/components/docs/badges";
import { CommentSidebar } from "@/components/docs/CommentSidebar";
import { SignatureModal } from "@/components/docs/SignatureModal";
import { PlateEditor } from "@/components/editor/plate-editor";

type DocPayload = {
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    content: unknown;
    updatedAt?: number;
  };
  signature: { id: string; signedAt?: number; userId?: string } | null;
  comments: Array<{ id: string; userId: string; body: string; resolved: boolean; createdAt?: number }>;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function ClientDocViewer({ docId }: { docId: string }) {
  const qc = useQueryClient();
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [signOpen, setSignOpen] = React.useState(false);
  const [signedFx, setSignedFx] = React.useState(false);

  const q = useQuery({
    queryKey: ["doc", docId],
    queryFn: () => fetchJson<DocPayload>(`/api/docs/${docId}`),
  });

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      await fetchJson(`/api/docs/${docId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["doc", docId] });
      toast.success("Comment added.");
    },
  });

  const approve = useMutation({
    mutationFn: async (signatureData: string) => {
      await fetchJson(`/api/docs/${docId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["doc", docId] });
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-[420px] w-full" />
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
  const showApprove = doc.status === "REVIEW" && doc.type === "CLIENT_VISIBLE";
  const signedAt = q.data!.signature?.signedAt ? new Date(q.data!.signature!.signedAt!) : null;
  const signerLabel = "You";

  return (
    <div className="space-y-5 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
            {doc.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DocTypeBadge type={doc.type} />
            <DocStatusBadge status={doc.status} />
            {doc.status === "APPROVED" && signedAt ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-ui text-[11px] font-semibold text-emerald-800">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Verified · Signed by {signerLabel} on {format(signedAt, "dd MMM yyyy")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            Comments
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <PlateEditor value={doc.content} readOnly />
      </div>

      <CommentSidebar
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        comments={q.data!.comments}
        canResolve={false}
        onAddComment={(body) => addComment.mutateAsync(body)}
        onResolve={async () => {}}
      />

      <SignatureModal
        open={signOpen}
        onOpenChange={setSignOpen}
        onConfirm={(sig) => approve.mutateAsync(sig)}
        onSigned={() => {
          if (signedFx) return;
          setSignedFx(true);
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.75 },
            colors: ["#B9FF66", "#09090b", "#ffffff"],
          });
        }}
      />

      {showApprove ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-headingAlt text-sm text-ink">
              <span className="font-semibold">Nadiron</span> is requesting your approval on this document.
            </div>
            <button
              type="button"
              onClick={() => setSignOpen(true)}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 sm:w-auto"
            >
              Approve &amp; Sign
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

