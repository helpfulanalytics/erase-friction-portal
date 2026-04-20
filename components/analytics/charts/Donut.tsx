"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number; color: string };

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Slice | undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 shadow-sm">
      <div className="font-ui text-[12px] font-semibold text-zinc-900">{p.name}</div>
      <div className="mt-0.5 font-ui text-[12px] text-zinc-600">{p.value}</div>
    </div>
  );
}

export function Donut({
  data,
  centerTop,
  centerBottom,
}: {
  data: Slice[];
  centerTop: string;
  centerBottom?: string;
}) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<TooltipContent />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="transparent"
            isAnimationActive={false}
          >
            {data.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="font-headingAlt text-[15px] font-semibold text-zinc-900">
            {centerTop}
          </div>
          {centerBottom ? (
            <div className="mt-0.5 font-ui text-[12px] text-zinc-500">{centerBottom}</div>
          ) : total ? null : (
            <div className="mt-0.5 font-ui text-[12px] text-zinc-500">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}

