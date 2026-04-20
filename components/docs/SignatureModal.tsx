"use client";

import * as React from "react";
import SignaturePad from "signature_pad";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SignatureModal({
  open,
  onOpenChange,
  onConfirm,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureData: string) => Promise<void>;
  onSigned?: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const padRef = React.useRef<SignaturePad | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to container.
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 420;
    canvas.width = width;
    canvas.height = 180;

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,1)",
      penColor: "#09090b",
    });

    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open]);

  function clear() {
    padRef.current?.clear();
  }

  async function confirm() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Please add your signature.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = pad.toDataURL("image/png");
      await onConfirm(dataUrl);
      toast.success("Signed and approved.");
      onSigned?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve &amp; Sign</DialogTitle>
          <DialogDescription>
            Draw your signature below, then confirm to approve this document.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface p-3">
          <canvas ref={canvasRef} className="w-full rounded-lg" />
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            disabled={busy}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Signing…" : "Confirm & Sign"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

