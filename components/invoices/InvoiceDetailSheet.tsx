"use client";

import * as React from "react";
import { format } from "date-fns";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type Invoice = {
  id: string;
  projectId: string;
  number?: string;
  invoiceNumber?: string;
  amount: number;
  currency?: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate?: number;
  createdAt?: number;
  fileUrl?: string | null;
};

function ngn(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}

function badge(status: Invoice["status"]) {
  if (status === "PAID") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "OVERDUE") return "border-red-300 bg-red-50 text-red-800";
  return "border-amber-300 bg-amber-50 text-amber-900";
}

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
  projectName,
  mode,
  onStatusChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  projectName?: string;
  mode: "client" | "admin";
  onStatusChange?: (status: Invoice["status"]) => Promise<void>;
}) {
  if (!invoice) return null;
  const number = invoice.number ?? invoice.invoiceNumber ?? invoice.id.slice(0, 6);
  const due = invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "—";
  const issued = invoice.createdAt ? format(new Date(invoice.createdAt), "dd MMM yyyy") : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-10">
            <div>
              <SheetTitle>Invoice {number}</SheetTitle>
              <SheetDescription>{projectName ?? invoice.projectId}</SheetDescription>
            </div>
            <span className={cn("rounded-full border px-2 py-1 font-ui text-xs font-semibold", badge(invoice.status))}>
              {invoice.status}
            </span>
          </div>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
              <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Amount
              </div>
              <div className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-ink">
                {ngn(invoice.amount)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="font-ui text-xs font-semibold text-muted-foreground">Due date</div>
                  <div className="font-ui text-sm text-ink">{due}</div>
                </div>
                <div>
                  <div className="font-ui text-xs font-semibold text-muted-foreground">Issued</div>
                  <div className="font-ui text-sm text-ink">{issued}</div>
                </div>
              </div>
            </div>

            {invoice.fileUrl ? (
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                <div className="border-b border-border px-4 py-3">
                  <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    PDF preview
                  </div>
                </div>
                <iframe src={invoice.fileUrl} className="h-[420px] w-full" />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-subtle p-4 font-ui text-sm text-muted-foreground">
                No PDF uploaded yet.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {invoice.fileUrl ? (
                <a
                  href={invoice.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink"
                >
                  Download PDF
                </a>
              ) : null}

              {mode === "admin" && onStatusChange ? (
                <select
                  value={invoice.status}
                  onChange={(e) => onStatusChange(e.target.value as Invoice["status"])}
                  className="h-11 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              ) : null}
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

