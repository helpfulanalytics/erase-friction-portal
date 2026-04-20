"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeSignerName } from "@/lib/normalize-signer-name";

type Me = { uid: string; email: string; name: string; avatar: string };

export function DocumentApprovalModal({
  open,
  onOpenChange,
  onConfirm,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { typedFullName: string }) => Promise<void>;
  onApproved?: () => void;
}) {
  const [me, setMe] = React.useState<Me | null>(null);
  const [typed, setTyped] = React.useState("");
  const [ack, setAck] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTyped("");
      setAck(false);
      setMe(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok || cancelled) return;
      setMe((await res.json()) as Me);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const expectedNorm = me ? normalizeSignerName(me.name) : "";
  const typedNorm = normalizeSignerName(typed);
  const nameMatches = me ? typedNorm.length > 0 && typedNorm === expectedNorm : false;
  const canSubmit = ack && nameMatches && !busy;

  async function submit() {
    if (!canSubmit || !me) return;
    setBusy(true);
    try {
      await onConfirm({ typedFullName: typed.trim().replace(/\s+/g, " ") });
      toast.success("Document approved.");
      onApproved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve this document</DialogTitle>
          <DialogDescription>
            Confirm you have read the document and type your full name exactly as it appears on your
            account. This replaces a drawn signature and works on any device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {me ? (
            <div className="rounded-lg border border-border bg-subtle px-3 py-2 font-ui text-sm text-ink">
              <span className="text-muted-foreground">Name on file: </span>
              <span className="font-semibold">{me.name}</span>
            </div>
          ) : (
            <p className="font-ui text-sm text-muted-foreground">Loading your profile…</p>
          )}

          <label className="flex cursor-pointer gap-3 font-ui text-sm text-ink">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border border-input accent-brand"
            />
            <span>
              I have read this document and approve it. I understand this action may be legally
              binding for my organization.
            </span>
          </label>

          <div className="space-y-1.5">
            <label htmlFor="approval-full-name" className="font-ui text-sm font-medium text-ink">
              Type your full name to confirm
            </label>
            <Input
              id="approval-full-name"
              autoComplete="name"
              placeholder="Same spelling as above"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!me}
              className="h-11 min-h-11 text-base md:text-sm"
            />
            {me && typedNorm.length > 0 && !nameMatches ? (
              <p className="font-ui text-xs text-destructive">Must match your account name exactly.</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {busy ? "Submitting…" : "Submit approval"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
