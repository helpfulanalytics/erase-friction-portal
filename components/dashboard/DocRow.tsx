"use client";

import Link from "next/link";
import { FileText, FileImage, FolderOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

function DocIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes("image")) return <FileImage className="size-4 text-muted-foreground" />;
  if (t.includes("folder")) return <FolderOpen className="size-4 text-muted-foreground" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

export function DocRow({
  title,
  type,
  status,
  updated,
  href,
  className,
}: {
  title: string;
  type: string;
  status: string;
  updated: string;
  href: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[20px_1fr_auto_auto_auto] sm:grid-cols-[20px_1fr_auto_auto_auto_auto] items-center gap-3 py-2.5",
        className
      )}
    >
      <DocIcon type={type} />
      <div className="min-w-0">
        <div className="truncate font-headingAlt text-sm font-semibold text-ink">
          {title}
        </div>
      </div>
      <span className="hidden sm:inline-flex rounded-full border border-border bg-subtle px-2 py-0.5 font-ui text-[11px] font-semibold text-muted-foreground">
        {type}
      </span>
      <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-ui text-[11px] font-semibold text-muted-foreground">
        {status}
      </span>
      <span className="hidden sm:inline font-ui text-xs text-muted-foreground">
        {updated}
      </span>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 font-ui text-xs font-semibold text-ink transition-colors hover:bg-subtle"
      >
        <Eye className="size-3.5" />
        View
      </Link>
    </div>
  );
}

