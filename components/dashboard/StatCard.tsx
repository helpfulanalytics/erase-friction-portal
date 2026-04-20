"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "warning";

export function StatCard({
  title,
  value,
  sublabel,
  rightMeta,
  tone = "default",
  children,
}: {
  title: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  rightMeta?: React.ReactNode;
  tone?: StatCardTone;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-card">
      <span className="absolute left-0 top-4 h-7 w-[3px] rounded-r-full bg-brand" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-ui text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            {title}
          </div>
          <div className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-ink">
            {value}
          </div>
        </div>

        {rightMeta ? (
          <div
            className={cn(
              "shrink-0 rounded-lg border px-2 py-1 font-ui text-[11px] font-semibold",
              tone === "warning"
                ? "border-orange-300 bg-orange-50 text-orange-800"
                : "border-border bg-subtle text-muted-foreground"
            )}
          >
            {rightMeta}
          </div>
        ) : null}
      </div>

      {sublabel ? (
        <div className="mt-2 font-ui text-sm text-muted-foreground">{sublabel}</div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

