"use client";

import { cn } from "@/lib/utils";

export function MilestoneProgressBar({
  label,
  percent,
  className,
}: {
  label: string;
  percent: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate font-ui text-sm font-medium text-ink">
          {label}
        </div>
        <div className="shrink-0 font-ui text-xs font-semibold text-muted-foreground">
          {p}%
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

