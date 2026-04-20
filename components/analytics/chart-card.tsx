"use client";

import * as React from "react";

export function ChartCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#e4e4e7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-headingAlt text-[15px] font-semibold text-zinc-900">
          {title}
        </h2>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4 h-[260px]">{children}</div>
    </section>
  );
}

