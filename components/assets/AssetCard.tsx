"use client";

import * as React from "react";
import { format } from "date-fns";
import { Download, FileArchive, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import type { Asset } from "./types";
import { formatBytes, kindForAsset } from "./types";

function iconForKind(kind: ReturnType<typeof kindForAsset>) {
  if (kind === "IMAGE") return <ImageIcon className="size-5 text-muted-foreground" />;
  if (kind === "ARCHIVE") return <FileArchive className="size-5 text-muted-foreground" />;
  return <FileText className="size-5 text-muted-foreground" />;
}

export function AssetCard({
  asset,
  uploaderName,
  canDelete,
  onDelete,
}: {
  asset: Asset;
  uploaderName?: string;
  canDelete: boolean;
  onDelete: (assetId: string) => Promise<void>;
}) {
  const kind = kindForAsset(asset);
  const when = asset.createdAt ? format(new Date(asset.createdAt), "dd MMM yyyy") : "";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="relative aspect-[4/3] w-full bg-subtle">
        {kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {iconForKind(kind)}
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="min-w-0">
          <div className="truncate font-ui text-sm font-semibold text-ink">
            {asset.name}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2 font-ui text-xs text-muted-foreground">
            <span>{formatBytes(asset.size)}</span>
            <span className="truncate">
              {uploaderName ? `${uploaderName} · ${when}` : when}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            <Download className="size-4" />
            Download
          </a>

          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(asset.id)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
              aria-label="Delete asset"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

