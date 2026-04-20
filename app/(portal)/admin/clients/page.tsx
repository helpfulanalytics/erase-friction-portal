import type { Metadata } from "next";
import AdminClientsClient from "./page-client";

export const metadata: Metadata = { title: "Clients — Erase Friction Admin" };

export default function AdminClientsPage() {
  return <AdminClientsClient />;
}
