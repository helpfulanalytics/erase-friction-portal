"use client";

import Link from "next/link";
import { FileText, FileCheck, FileClock } from "lucide-react";
import { format } from "date-fns";
import { DocStatusBadge, DocTypeBadge } from "./badges";

export function DocCard({
  id,
  title,
  type,
  status,
  updatedAt,
  mode,
}: {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt?: number | null;
  mode: "client" | "admin";
}) {
  const icon =
    status === "APPROVED" ? (
      <FileCheck className="size-4 text-muted-foreground" />
    ) : status === "REVIEW" ? (
      <FileClock className="size-4 text-muted-foreground" />
    ) : (
      <FileText className="size-4 text-muted-foreground" />
    );

  const updated = updatedAt ? format(new Date(updatedAt), "dd MMM yyyy") : "—";

  return (
    <div className="grid grid-cols-[20px_1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      {icon}
      <div className="min-w-0">
        <div className="truncate font-heading text-base font-extrabold tracking-tight text-ink">
          {title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DocTypeBadge type={type} />
          <DocStatusBadge status={status} />
        </div>
      </div>
      <div className="hidden md:block font-ui text-sm text-muted-foreground">
        {updated}
      </div>
      <Link
        href={mode === "admin" ? `/admin/docs/${id}/edit` : `/dashboard/docs/${id}`}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
      >
        {mode === "admin" ? "Edit" : "View"}
      </Link>
    </div>
  );
}

