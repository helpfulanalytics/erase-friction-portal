import type { Metadata } from "next";
import DevTimeClient from "./page-client";
export const metadata: Metadata = { title: "Time — Nadiron" };
export default function DevTimePage() {
  return <DevTimeClient />;
}
