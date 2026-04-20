"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function TrendPill({ value }: { value: number }) {
  const dir: "up" | "down" | "flat" =
    value > 0.0001 ? "up" : value < -0.0001 ? "down" : "flat";

  const cls =
    dir === "up"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : dir === "down"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-[#e4e4e7] bg-white text-zinc-600";

  const label =
    dir === "flat" ? "0%" : `${dir === "up" ? "+" : ""}${Math.abs(value).toFixed(0)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-ui text-[11px] font-semibold",
        cls
      )}
      aria-label={`Trend ${label}`}
    >
      {dir === "up" ? "↑" : dir === "down" ? "↓" : "—"} {label}
    </span>
  );
}

export function AnalyticsStatCard({
  title,
  value,
  sublabel,
  trendPct,
}: {
  title: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  trendPct?: number | null;
}) {
  return (
    <div className="rounded-[12px] border border-[#e4e4e7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-ui text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
            {title}
          </div>
          <div className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-zinc-900">
            {value}
          </div>
        </div>
        {typeof trendPct === "number" ? (
          <div className="shrink-0">
            <TrendPill value={trendPct} />
          </div>
        ) : null}
      </div>
      {sublabel ? (
        <div className="mt-2 font-ui text-sm text-zinc-500">{sublabel}</div>
      ) : null}
    </div>
  );
}

