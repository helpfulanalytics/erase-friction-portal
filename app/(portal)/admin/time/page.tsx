import type { Metadata } from "next";
import AdminTimeClient from "./page-client";
export const metadata: Metadata = { title: "Time — Nadiron Admin" };
export default function AdminTimePage() {
  return <AdminTimeClient />;
}
