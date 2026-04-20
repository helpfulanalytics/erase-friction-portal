"use client";

import * as React from "react";
import { Donut } from "./Donut";

export function MilestoneDonut({
  done,
  inProgress,
  pending,
  percentComplete,
}: {
  done: number;
  inProgress: number;
  pending: number;
  percentComplete: number;
}) {
  const data = React.useMemo(
    () => [
      { name: "Done", value: done, color: "#B9FF66" },
      { name: "In Progress", value: inProgress, color: "#a1a1aa" }, // zinc-400
      { name: "Pending", value: pending, color: "#e4e4e7" }, // zinc-200-ish
    ],
    [done, inProgress, pending]
  );

  return <Donut data={data} centerTop={`${percentComplete}% complete`} />;
}

