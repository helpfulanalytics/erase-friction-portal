import type { Metadata } from "next";
import MessagesClient from "@/app/(portal)/dashboard/messages/page-client";

export const metadata: Metadata = { title: "Messages — Erase Friction" };

export default function MessagesPage() {
  return <MessagesClient />;
}
