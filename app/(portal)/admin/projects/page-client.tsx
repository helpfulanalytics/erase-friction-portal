"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt?: number;
  memberCount: number;
  docCount: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function statusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" };
    case "PAUSED":
      return { label: "Paused", cls: "border-amber-300 bg-amber-50 text-amber-900" };
    case "ARCHIVED":
      return { label: "Archived", cls: "border-zinc-300 bg-zinc-50 text-zinc-600" };
    default:
      return { label: "Active", cls: "border-brand/60 bg-brand/10 text-amber-900" };
  }
}

function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("ACTIVE");

  const create = useMutation({
    mutationFn: () =>
      fetchJson<{ success: boolean }>("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, status }),
      }),
    onSuccess: () => {
      toast.success("Project created.");
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      setName("");
      setDescription("");
      setStatus("ACTIVE");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create project."),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="font-headingAlt text-lg font-bold text-ink">New project</h2>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Create a new client project.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
              Project name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="e.g. Acme Rebrand"
            />
          </div>

          <div>
            <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="Brief project description..."
            />
          </div>

          <div>
            <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProjectsClient() {
  const q = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/admin/projects"),
  });

  const [filter, setFilter] = React.useState<string>("ALL");
  const [modalOpen, setModalOpen] = React.useState(false);

  const projects = React.useMemo(() => {
    const all = q.data?.projects ?? [];
    if (filter === "ALL") return all;
    return all.filter((p) => p.status === filter);
  }, [q.data, filter]);

  const statuses = ["ALL", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink">
            All Projects
          </h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            {q.data?.projects.length ?? 0} projects total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                  filter === s
                    ? "bg-brand text-ink"
                    : "border border-border bg-surface text-muted-foreground hover:bg-subtle hover:text-ink"
                )}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink"
          >
            + New project
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : q.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 font-ui text-sm text-destructive shadow-card">
          {(q.error as Error).message}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="font-headingAlt text-lg font-bold text-ink">No projects yet</div>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-5 font-ui text-sm font-semibold text-ink"
          >
            + New project
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Project
                </th>
                <th className="hidden px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground sm:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-center font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground md:table-cell">
                  Members
                </th>
                <th className="hidden px-4 py-3 text-center font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground md:table-cell">
                  Docs
                </th>
                <th className="hidden px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground lg:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const badge = statusBadge(p.status);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-b-0 hover:bg-subtle transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Link href={`/admin/projects/${p.id}`} className="block">
                        <div className="font-headingAlt text-sm font-bold text-ink hover:underline">
                          {p.name || "Untitled"}
                        </div>
                        {p.description && (
                          <div className="mt-0.5 line-clamp-1 font-ui text-xs text-muted-foreground">
                            {p.description}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-1 font-ui text-xs font-semibold",
                          badge.cls
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 text-center font-ui text-sm text-ink md:table-cell">
                      {p.memberCount}
                    </td>
                    <td className="hidden px-4 py-4 text-center font-ui text-sm text-ink md:table-cell">
                      {p.docCount}
                    </td>
                    <td className="hidden px-4 py-4 font-ui text-sm text-muted-foreground lg:table-cell">
                      {p.createdAt ? format(new Date(p.createdAt), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
