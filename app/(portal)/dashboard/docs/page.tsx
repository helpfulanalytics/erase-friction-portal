import type { Metadata } from "next";
import ClientDocsList from "./page-client";

export const metadata: Metadata = { title: "Docs — Erase Friction" };

export default function ClientDocsPage() {
  return <ClientDocsList />;
}

