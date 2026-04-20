"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FileUploader({
  projectId,
  disabled,
  onUploaded,
}: {
  projectId: string | null;
  disabled?: boolean;
  onUploaded: () => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const [items, setItems] = React.useState<UploadItem[]>([]);

  async function uploadFile(file: File) {
    if (!projectId) {
      toast.error("Select a project first.");
      return;
    }

    const id = uid();
    setItems((prev) => [...prev, { id, file, progress: 0, status: "queued" }]);

    const form = new FormData();
    form.set("file", file);
    form.set("name", file.name);

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/projects/${encodeURIComponent(projectId)}/assets`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct, status: "uploading" } : it)));
      };
      xhr.onerror = () => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: "Upload failed" } : it)));
        resolve();
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: 100, status: "done" } : it)));
          toast.success(`Uploaded ${file.name}`);
          onUploaded();
        } else {
          let msg = "Upload failed";
          try {
            const data = JSON.parse(xhr.responseText) as { error?: string };
            if (data?.error) msg = data.error;
          } catch {}
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: msg } : it)));
          toast.error(msg);
        }
        resolve();
      };
      xhr.send(form);
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      // Firestore/API enforces type/size; we only do a light pre-check here.
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`);
        continue;
      }
      await uploadFile(file);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-border bg-subtle p-4",
          dragOver && "border-brand bg-brand/10"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          await handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <UploadCloud className="size-6 text-muted-foreground" />
          <div className="font-headingAlt text-sm font-semibold text-ink">
            Drag files here to upload
          </div>
          <div className="font-ui text-xs text-muted-foreground">
            Or choose files (max 50MB each)
          </div>
          <label className={cn("mt-1 inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-brand px-3 font-ui text-sm font-semibold text-ink", disabled && "opacity-50 pointer-events-none")}>
            Upload files
            <input
              type="file"
              className="hidden"
              multiple
              onChange={async (e) => {
                await handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(-5).map((it) => (
            <div key={it.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-ui text-sm font-semibold text-ink">
                    {it.file.name}
                  </div>
                  <div className="mt-0.5 font-ui text-xs text-muted-foreground">
                    {it.status === "error" ? it.error : it.status}
                  </div>
                </div>
                <div className="font-ui text-xs text-muted-foreground tabular-nums">
                  {it.progress}%
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-subtle">
                <div
                  className="h-2 rounded-full bg-brand transition-all"
                  style={{ width: `${it.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

