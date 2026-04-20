"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Project = { id: string; name?: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function CreateInvoiceModal({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  defaultProjectId: string;
  onCreated: () => void;
}) {
  const [projectId, setProjectId] = React.useState(defaultProjectId);
  const [number, setNumber] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setProjectId(defaultProjectId);
  }, [open, defaultProjectId]);

  async function submit() {
    if (!projectId) return toast.error("Select a project");
    if (!number.trim()) return toast.error("Invoice number is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Amount is invalid");
    if (!dueDate) return toast.error("Due date is required");
    if (!file) return toast.error("Upload a PDF");

    setBusy(true);
    try {
      // Upload PDF first
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("invoiceNumber", number.trim());
      form.set("file", file);

      const uploadRes = await fetch("/api/uploads/invoice-pdf", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const uploadData = (await uploadRes.json()) as { url?: string; path?: string; error?: string };
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      await fetchJson("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          number: number.trim(),
          amount: amt,
          dueDate: new Date(dueDate).getTime(),
          fileUrl: uploadData.url ?? null,
          storagePath: uploadData.path ?? null,
        }),
      });

      toast.success("Invoice created.");
      onOpenChange(false);
      onCreated();
      setNumber("");
      setAmount("");
      setDueDate("");
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>Create an invoice and upload the PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Project</div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
              disabled={busy}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Project"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Invoice #</div>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Amount (₦)</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                inputMode="decimal"
                disabled={busy}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Due date</div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">PDF</div>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-ink"
                disabled={busy}
              />
            </label>
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
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

