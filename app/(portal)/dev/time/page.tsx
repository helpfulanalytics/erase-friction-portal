import type { Metadata } from "next";
import DevTimeClient from "./page-client";
export const metadata: Metadata = { title: "Time — Erase Friction" };
export default function DevTimePage() {
  return <DevTimeClient />;
}
