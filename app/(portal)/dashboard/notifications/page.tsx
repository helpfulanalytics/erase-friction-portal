import type { Metadata } from "next";
import NotificationsClient from "./page-client";

export const metadata: Metadata = { title: "Notifications — Nadiron" };

export default function NotificationsPage() {
  return <NotificationsClient />;
}

