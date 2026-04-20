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

type Row = { projectId: string; projectName: string; avgDays: number };

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Row | undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 shadow-sm">
      <div className="font-ui text-[12px] font-semibold text-zinc-900">{p.projectName}</div>
      <div className="mt-0.5 font-ui text-[12px] text-zinc-600">{p.avgDays.toFixed(1)} days</div>
    </div>
  );
}

export function ApprovalBarChart({ data }: { data: Row[] }) {
  const cleaned = React.useMemo(
    () => data.map((d) => ({ ...d, avgDays: Number.isFinite(d.avgDays) ? d.avgDays : 0 })),
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
        <Bar dataKey="avgDays" fill="#f59e0b" radius={[6, 6, 0, 0]}>
          <LabelList
            dataKey="avgDays"
            position="top"
            formatter={(v: any) => `${Number(v).toFixed(1)}d`}
            className="font-ui text-[12px] fill-zinc-700"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

