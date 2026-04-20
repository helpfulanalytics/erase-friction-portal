"use client";

import * as React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  userId: string;
  body: string;
  resolved: boolean;
  createdAt?: number;
};

function initials(id: string) {
  return id.slice(0, 2).toUpperCase();
}

export function CommentSidebar({
  open,
  onOpenChange,
  comments,
  canResolve,
  onAddComment,
  onResolve,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: Comment[];
  canResolve: boolean;
  onAddComment: (body: string) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onAddComment(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] max-w-[calc(100vw-2rem)]">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>Feedback and notes on this document.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-auto pb-4">
            {comments.length === 0 ? (
              <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-muted-foreground">
                No comments yet.
              </div>
            ) : (
              comments.map((c) => {
                const when = c.createdAt
                  ? formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })
                  : "just now";
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-xl border border-border bg-surface p-3",
                      c.resolved && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-subtle font-ui text-[11px] font-semibold text-ink">
                          {initials(c.userId)}
                        </div>
                        <div className="font-ui text-xs text-muted-foreground">{when}</div>
                      </div>
                      {canResolve ? (
                        <button
                          type="button"
                          className="rounded-md border border-border bg-surface px-2 py-1 font-ui text-xs font-semibold text-ink hover:bg-subtle"
                          onClick={() => onResolve(c.id, !c.resolved)}
                        >
                          {c.resolved ? "Unresolve" : "Resolve"}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 font-headingAlt text-sm text-ink">{c.body}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border pt-4">
            <label className="font-ui text-xs font-semibold text-ink">
              Add comment
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="Write a comment…"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={busy || !text.trim()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

