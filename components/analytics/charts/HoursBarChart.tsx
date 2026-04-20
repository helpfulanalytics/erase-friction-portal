"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { projectId: string; projectName: string; hours: number };

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Row | undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 shadow-sm">
      <div className="font-ui text-[12px] font-semibold text-zinc-900">{p.projectName}</div>
      <div className="mt-0.5 font-ui text-[12px] text-zinc-600">{p.hours.toFixed(1)} hours</div>
    </div>
  );
}

export function HoursBarChart({ data }: { data: Row[] }) {
  const sorted = React.useMemo(() => [...data].sort((a, b) => a.hours - b.hours), [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
        {/* No gridlines per rules */}
        <CartesianGrid horizontal={false} vertical={false} stroke="transparent" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
        />
        <YAxis
          type="category"
          dataKey="projectName"
          width={130}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="hours" fill="#f59e0b" radius={[6, 6, 6, 6]}>
          <LabelList
            dataKey="hours"
            position="right"
            formatter={(v: any) => `${Number(v).toFixed(1)}h`}
            className="font-ui text-[12px] fill-zinc-700"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

