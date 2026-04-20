import type { Metadata } from "next";
import ProjectsClient from "./page-client";

export const metadata: Metadata = { title: "Projects — Erase Friction" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
