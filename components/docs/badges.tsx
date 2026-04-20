"use client";

import { cn } from "@/lib/utils";
import type { DocumentStatus, DocumentType } from "@/types/models";

export function DocTypeBadge({ type }: { type: DocumentType | string }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-subtle px-2 py-0.5 font-ui text-[11px] font-semibold text-muted-foreground">
      {String(type).replaceAll("_", " ")}
    </span>
  );
}

export function DocStatusBadge({ status }: { status: DocumentStatus | string }) {
  const s = String(status).toUpperCase();
  const cls =
    s === "APPROVED"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : s === "REVIEW"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-border bg-surface text-muted-foreground";

  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-ui text-[11px] font-semibold", cls)}>
      {s}
    </span>
  );
}

