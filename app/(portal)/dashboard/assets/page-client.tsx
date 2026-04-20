"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

type Project = { id: string; name?: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function AssetsClient() {
  const projectsQ = useQuery({
    queryKey: ["projects", "me"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/projects"),
  });

  // Lightweight uploader name map: show uid if no name.
  const usersById = React.useMemo(() => new Map<string, string>(), []);

  const projects = projectsQ.data?.projects ?? [];

  return (
    <AssetLibrary
      mode="client"
      projects={projects}
      usersById={usersById}
      defaultProjectId={projects[0]?.id ?? null}
    />
  );
}

