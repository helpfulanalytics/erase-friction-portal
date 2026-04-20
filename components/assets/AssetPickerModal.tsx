"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@/components/assets/types";
import { formatBytes, kindForAsset } from "@/components/assets/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function AssetPickerModal({
  open,
  onOpenChange,
  projectId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onPick: (asset: Asset) => Promise<void>;
}) {
  const [query, setQuery] = React.useState("");

  const assetsQ = useQuery({
    queryKey: ["assets", "pick", projectId],
    queryFn: () => fetchJson<{ assets: Asset[] }>(`/api/projects/${projectId}/assets`),
    enabled: open,
  });

  const assets = (assetsQ.data?.assets ?? []).filter((a) => {
    if (!query) return true;
    return a.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach an asset</DialogTitle>
          <DialogDescription>Select a project asset to attach to this task.</DialogDescription>
        </DialogHeader>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
          placeholder="Search assets…"
        />

        <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
          {assetsQ.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : assetsQ.error ? (
            <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-destructive">
              {(assetsQ.error as Error).message}
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-muted-foreground">
              No assets found.
            </div>
          ) : (
            assets.map((a) => {
              const kind = kindForAsset(a);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={async () => {
                    await onPick(a);
                    onOpenChange(false);
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left hover:bg-subtle"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-ui text-sm font-semibold text-ink">
                        {a.name}
                      </div>
                      <div className="mt-0.5 font-ui text-xs text-muted-foreground">
                        {kind} · {formatBytes(a.size)}
                      </div>
                    </div>
                    <div className="font-ui text-xs text-muted-foreground">
                      Attach
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

