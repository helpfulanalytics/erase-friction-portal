import type { Metadata } from "next";
import AdminProjectOverview from "./page-client";

export const metadata: Metadata = { title: "Project — Nadiron Admin" };

export default async function AdminProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminProjectOverview projectId={id} />;
}

