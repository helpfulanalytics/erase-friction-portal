import type { Metadata } from "next";
import ClientDocsList from "@/app/(portal)/dashboard/docs/page-client";

export const metadata: Metadata = { title: "Docs — Erase Friction" };

export default function DocsPage() {
  return <ClientDocsList />;
}
