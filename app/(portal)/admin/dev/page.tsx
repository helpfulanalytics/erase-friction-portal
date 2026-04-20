import type { Metadata } from "next";
import AdminDevSeedClient from "./page-client";

export const metadata: Metadata = { title: "Dev Panel — Erase Friction Admin" };

export default function AdminDevPage() {
  return <AdminDevSeedClient />;
}
