import type { Metadata } from "next";
import ClientDocsList from "./page-client";

export const metadata: Metadata = { title: "Docs — Nadiron" };

export default function ClientDocsPage() {
  return <ClientDocsList />;
}

