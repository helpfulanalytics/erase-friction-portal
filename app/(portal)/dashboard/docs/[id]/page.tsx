import type { Metadata } from "next";
import ClientDocViewer from "./page-client";

export const metadata: Metadata = { title: "Document — Erase Friction" };

export default async function DocViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDocViewer docId={id} />;
}

