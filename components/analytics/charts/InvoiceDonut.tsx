"use client";

import * as React from "react";
import { Donut } from "./Donut";

export function InvoiceDonut({
  paid,
  pending,
  overdue,
  total,
}: {
  paid: number;
  pending: number;
  overdue: number;
  total: number;
}) {
  const data = React.useMemo(
    () => [
      { name: "Paid", value: paid, color: "#16a34a" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Overdue", value: overdue, color: "#dc2626" },
    ],
    [paid, pending, overdue]
  );

  return <Donut data={data} centerTop={`${total}`} centerBottom="invoices" />;
}

