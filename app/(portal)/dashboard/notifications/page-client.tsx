"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt?: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function groupLabel(ts: number) {
  const d = new Date(ts);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

export default function NotificationsClient() {
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: () => fetchJson<{ notifications: Notif[] }>("/api/notifications?limit=200"),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await fetchJson("/api/notifications/read", { method: "PATCH" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications", "me"] });
      toast.success("All notifications marked as read.");
    },
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications", "me"] });
    },
  });

  const notifications = q.data?.notifications ?? [];
  const grouped = new Map<string, Notif[]>();
  for (const n of notifications) {
    const key = n.createdAt ? groupLabel(n.createdAt) : "Earlier";
    const list = grouped.get(key) ?? [];
    list.push(n);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="mt-1 font-headingAlt text-base text-muted-foreground">
            Updates across your projects.
          </p>
        </div>

        <button
          type="button"
          disabled={markAll.isPending}
          onClick={() => markAll.mutate()}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : q.error ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">{(q.error as Error).message}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([label, items]) => (
            <div key={label} className="space-y-2">
              <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                {label}
              </div>
              <div className="space-y-2">
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={async () => {
                      if (!n.read) await markOne.mutateAsync(n.id);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      "w-full rounded-xl border border-border bg-surface p-4 text-left shadow-card hover:bg-subtle",
                      !n.read && "border-brand/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-ui text-sm font-semibold text-ink">
                          {n.title}
                        </div>
                        <div className="mt-1 font-headingAlt text-sm text-muted-foreground">
                          {n.body}
                        </div>
                      </div>
                      <div className="shrink-0 font-ui text-xs text-muted-foreground">
                        {n.createdAt ? format(new Date(n.createdAt), "HH:mm") : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

