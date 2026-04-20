import type { Metadata } from "next";
import AdminAssetsClient from "./page-client";

export const metadata: Metadata = { title: "Assets — Nadiron Admin" };

export default function AdminAssetsPage() {
  return <AdminAssetsClient />;
}

