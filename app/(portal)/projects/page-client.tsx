"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FolderOpen, FileText, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt?: number;
  memberCount?: number;
  docCount?: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function statusBadge(status: string) {
  switch (status?.toUpperCase()) {
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

export default function ProjectsClient() {
  const q = useQuery({
    queryKey: ["projects", "me"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/projects"),
  });

  const projects = q.data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
          Projects
        </h1>
        <p className="mt-1 font-headingAlt text-base text-muted-foreground">
          {projects.length > 0
            ? `You're a member of ${projects.length} project${projects.length === 1 ? "" : "s"}.`
            : "Your active projects will appear here."}
        </p>
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : q.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(q.error as Error).message}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-card">
          <FolderOpen className="mb-3 size-10 text-muted-foreground/40" />
          <p className="font-headingAlt text-base font-semibold text-ink">No projects yet</p>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            Ask your admin to add you to a project.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const badge = statusBadge(p.status);
            return (
              <Link
                key={p.id}
                href={`/dashboard/docs?projectId=${p.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-all duration-150 hover:border-brand/40 hover:shadow-md"
              >
                <span className="absolute inset-x-0 top-0 h-[3px] bg-brand opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-headingAlt text-base font-bold text-ink group-hover:text-ink">
                      {p.name || "Untitled"}
                    </h2>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 font-ui text-[11px] font-semibold",
                        badge.cls,
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {p.description ? (
                    <p className="line-clamp-2 font-ui text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-center gap-4 pt-2">
                    {typeof p.memberCount === "number" && (
                      <span className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        {p.memberCount} member{p.memberCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {typeof p.docCount === "number" && (
                      <span className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground">
                        <FileText className="size-3.5" />
                        {p.docCount} doc{p.docCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {p.createdAt ? (
                      <span className="ml-auto font-ui text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "dd MMM yyyy")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
