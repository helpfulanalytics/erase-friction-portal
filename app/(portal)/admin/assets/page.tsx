import type { Metadata } from "next";
import AdminAssetsClient from "./page-client";

export const metadata: Metadata = { title: "Assets — Erase Friction Admin" };

export default function AdminAssetsPage() {
  return <AdminAssetsClient />;
}

