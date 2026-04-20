import type { Metadata } from "next";
import InvoicesClient from "./page-client";

export const metadata: Metadata = { title: "Invoices — Nadiron" };

export default function ClientInvoicesPage() {
  return <InvoicesClient />;
}

