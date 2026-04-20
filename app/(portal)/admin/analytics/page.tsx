import type { Metadata } from "next";
import AdminAnalyticsClient from "./page-client";

export const metadata: Metadata = { title: "Analytics — Nadiron Admin" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
