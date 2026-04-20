import type { Metadata } from "next";
import AdminProjectDocs from "./page-client";

export const metadata: Metadata = { title: "Project Docs — Nadiron Admin" };

export default async function AdminProjectDocsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminProjectDocs projectId={id} />;
}

