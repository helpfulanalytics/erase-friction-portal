"use client";

import { cn } from "@/lib/utils";

export function ActivityFeedItem({
  name,
  description,
  when,
  type,
  meta,
  className,
}: {
  name: string;
  description: string;
  when: string;
  type?: string;
  meta?: Record<string, unknown>;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const detail =
    description ||
    (type
      ? type
          .replaceAll(".", " ")
          .replaceAll("_", " ")
          .toLowerCase()
      : "");

  const metaSuffix =
    meta && Object.keys(meta).length > 0 ? ` · ${Object.keys(meta).length} meta` : "";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-subtle font-ui text-xs font-semibold text-ink">
        {initials}
      </div>
      <div className="min-w-0">
        <div className="font-headingAlt text-sm font-medium text-ink">
          <span className="font-semibold">{name}</span>{" "}
          <span className="text-muted-foreground font-ui">
            {detail}
            {metaSuffix}
          </span>
        </div>
        <div className="mt-0.5 font-ui text-xs text-muted-foreground">{when}</div>
      </div>
    </div>
  );
}

