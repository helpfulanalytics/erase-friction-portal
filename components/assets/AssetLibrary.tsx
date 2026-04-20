"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetCard } from "@/components/assets/AssetCard";
import type { Asset } from "@/components/assets/types";
import { FileUploader } from "@/components/assets/FileUploader";
import { kindForAsset } from "@/components/assets/types";

type Project = { id: string; name?: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function AssetLibrary({
  mode,
  projects,
  usersById,
  defaultProjectId,
}: {
  mode: "client" | "admin";
  projects: Project[];
  usersById: Map<string, string>;
  defaultProjectId?: string | null;
}) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = React.useState<string>(
    mode === "admin" ? "ALL" : (defaultProjectId ?? (projects[0]?.id ?? ""))
  );
  const [type, setType] = React.useState<"ALL" | "IMAGES" | "DOCUMENTS" | "ARCHIVES">("ALL");
  const [query, setQuery] = React.useState("");

  const assetsQ = useQuery({
    queryKey: ["assets", mode, projectId],
    queryFn: async () => {
      if (mode === "admin") {
        const qs = new URLSearchParams();
        if (projectId && projectId !== "ALL") qs.set("projectId", projectId);
        return await fetchJson<{ assets: Asset[] }>(`/api/assets?${qs.toString()}`);
      }
      if (!projectId) return { assets: [] as Asset[] };
      return await fetchJson<{ assets: Asset[] }>(`/api/projects/${projectId}/assets`);
    },
    enabled: mode === "admin" || projectId.length > 0,
  });

  const del = useMutation({
    mutationFn: async (assetId: string) => {
      const ok = window.confirm("Delete this asset? This cannot be undone.");
      if (!ok) return;
      await fetchJson(`/api/assets/${assetId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      toast.success("Asset deleted.");
      await qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const assets = (assetsQ.data?.assets ?? []).filter((a) => {
    if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
    const k = kindForAsset(a);
    if (type === "IMAGES" && k !== "IMAGE") return false;
    if (type === "DOCUMENTS" && k !== "DOCUMENT") return false;
    if (type === "ARCHIVES" && k !== "ARCHIVE") return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
            Assets
          </h1>
          <p className="mt-1 font-headingAlt text-base text-muted-foreground">
            Files shared for this project.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === "admin" ? (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              <option value="ALL">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Project"}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Project"}
                </option>
              ))}
            </select>
          )}

          <select
            value={type}
            onChange={(e) => setType(e.target.value as "ALL" | "IMAGES" | "DOCUMENTS" | "ARCHIVES")}
            className="h-10 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
          >
            <option value="ALL">All types</option>
            <option value="IMAGES">Images</option>
            <option value="DOCUMENTS">Documents</option>
            <option value="ARCHIVES">Archives</option>
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename…"
            className="h-10 w-56 rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      {mode === "admin" ? (
        <FileUploader
          projectId={projectId === "ALL" ? null : projectId}
          disabled={projectId === "ALL"}
          onUploaded={async () => {
            await qc.invalidateQueries({ queryKey: ["assets"] });
          }}
        />
      ) : null}

      {assetsQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : assetsQ.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(assetsQ.error as Error).message}</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-muted-foreground">No assets found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              uploaderName={usersById.get(a.uploadedBy)}
              canDelete={mode === "admin"}
              onDelete={async (id) => await del.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

