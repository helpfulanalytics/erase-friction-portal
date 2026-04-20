"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

type Project = { id: string; name?: string };
type User = { id: string; name?: string; email?: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export default function AdminAssetsClient() {
  const teamQ = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => fetchJson<{ users: User[]; projects: Project[] }>("/api/admin/team"),
  });

  const usersById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of teamQ.data?.users ?? []) {
      map.set(u.id, u.name ?? u.email ?? u.id);
    }
    return map;
  }, [teamQ.data?.users]);

  const projects = teamQ.data?.projects ?? [];

  return (
    <AssetLibrary
      mode="admin"
      projects={projects}
      usersById={usersById}
      defaultProjectId={projects[0]?.id ?? null}
    />
  );
}

