import type { Metadata } from "next";
import InvoicesClient from "./page-client";

export const metadata: Metadata = { title: "Invoices — Erase Friction" };

export default function ClientInvoicesPage() {
  return <InvoicesClient />;
}

