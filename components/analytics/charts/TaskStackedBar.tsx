"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  projectId: string;
  projectName: string;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
};

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 shadow-sm">
      <div className="font-ui text-[12px] font-semibold text-zinc-900">{label}</div>
      <div className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-6 font-ui text-[12px] text-zinc-600">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-sm" style={{ background: r.color }} />
              {r.name}
            </span>
            <span className="font-semibold text-zinc-900">{Number(r.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskStackedBar({ data }: { data: Row[] }) {
  const cleaned = React.useMemo(
    () =>
      data.map((d) => ({
        ...d,
        todo: Number(d.todo ?? 0) || 0,
        inProgress: Number(d.inProgress ?? 0) || 0,
        inReview: Number(d.inReview ?? 0) || 0,
        done: Number(d.done ?? 0) || 0,
      })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={cleaned} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} vertical={false} stroke="transparent" />
        <XAxis
          dataKey="projectName"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="todo" stackId="a" name="Todo" fill="#e4e4e7" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inProgress" stackId="a" name="In Progress" fill="#a1a1aa" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inReview" stackId="a" name="In Review" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="done" stackId="a" name="Done" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

