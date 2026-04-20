import type { Metadata } from "next";
import AdminDocEditor from "./page-client";

export const metadata: Metadata = { title: "Edit document — Erase Friction Admin" };

export default async function AdminDocEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDocEditor docId={id} />;
}

