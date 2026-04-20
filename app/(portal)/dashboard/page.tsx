import type { Metadata } from "next";
export const metadata: Metadata = { title: "Dashboard — Nadiron" };
import DashboardClient from "./DashboardClient";
export default function DashboardPage() {
  return <DashboardClient />;
}
