import type { Metadata } from "next";
import AssetsClient from "./page-client";

export const metadata: Metadata = { title: "Assets — Nadiron" };

export default function ClientAssetsPage() {
  return <AssetsClient />;
}

