import type { Metadata } from "next";
import AdminProjectsClient from "./page-client";

export const metadata: Metadata = { title: "All Projects — Nadiron Admin" };

export default function AdminProjectsPage() {
  return <AdminProjectsClient />;
}
