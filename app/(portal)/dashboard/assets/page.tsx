import type { Metadata } from "next";
import AssetsClient from "./page-client";

export const metadata: Metadata = { title: "Assets — Erase Friction" };

export default function ClientAssetsPage() {
  return <AssetsClient />;
}

