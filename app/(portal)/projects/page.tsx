import type { Metadata } from "next";
import ProjectsClient from "./page-client";

export const metadata: Metadata = { title: "Projects — Nadiron" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
