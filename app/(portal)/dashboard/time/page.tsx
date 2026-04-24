import type { Metadata } from "next";
import DashboardTimeClient from "./page-client";

export const metadata: Metadata = { title: "My Time — Erase Friction" };

export default function DashboardTimePage() {
  return <DashboardTimeClient />;
}

