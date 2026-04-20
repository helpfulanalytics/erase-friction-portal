import type { Metadata } from "next";
import NotificationsClient from "./page-client";

export const metadata: Metadata = { title: "Notifications — Erase Friction" };

export default function NotificationsPage() {
  return <NotificationsClient />;
}

