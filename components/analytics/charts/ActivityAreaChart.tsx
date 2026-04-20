"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { date: string; count: number };

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value as number | undefined;
  return (
    <div className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 shadow-sm">
      <div className="font-ui text-[12px] font-semibold text-zinc-900">{label}</div>
      <div className="mt-0.5 font-ui text-[12px] text-zinc-600">{Number(v ?? 0)} events</div>
    </div>
  );
}

export function ActivityAreaChart({ data }: { data: Row[] }) {
  const cleaned = React.useMemo(
    () => data.map((d) => ({ date: d.date, count: Number(d.count ?? 0) || 0 })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={cleaned} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="limeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9FF66" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#B9FF66" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} vertical={false} stroke="transparent" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontFamily: "var(--font-ui, ui-sans-serif)" }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#B9FF66"
          fill="url(#limeFill)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

