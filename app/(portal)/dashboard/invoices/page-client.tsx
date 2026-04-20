"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { InvoiceDetailSheet, type Invoice } from "@/components/invoices/InvoiceDetailSheet";

type Project = { id: string; name?: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function ngn(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}

function badge(status: Invoice["status"]) {
  if (status === "PAID") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "OVERDUE") return "border-red-300 bg-red-50 text-red-800";
  return "border-amber-300 bg-amber-50 text-amber-900";
}

export default function InvoicesClient() {
  const projectsQ = useQuery({
    queryKey: ["projects", "me"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/projects"),
  });

  const [selected, setSelected] = React.useState<Invoice | null>(null);
  const [open, setOpen] = React.useState(false);

  const invoicesQ = useQuery({
    queryKey: ["invoices", "client", projectsQ.data?.projects?.map((p) => p.id).join(",")],
    enabled: (projectsQ.data?.projects?.length ?? 0) > 0,
    queryFn: async () => {
      const all: Invoice[] = [];
      for (const p of projectsQ.data!.projects) {
        const res = await fetchJson<{ invoices: Invoice[] }>(`/api/projects/${p.id}/invoices`);
        for (const inv of res.invoices) all.push(inv);
      }
      all.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return all;
    },
  });

  const projectsById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projectsQ.data?.projects ?? []) map.set(p.id, p.name ?? p.id);
    return map;
  }, [projectsQ.data?.projects]);

  const invoices = invoicesQ.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink">
          Invoices
        </h1>
        <p className="mt-1 font-headingAlt text-base text-muted-foreground">
          Billing and payment history.
        </p>
      </div>

      {projectsQ.isLoading || invoicesQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (projectsQ.error || invoicesQ.error) ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-destructive">
            {String((projectsQ.error as Error)?.message ?? (invoicesQ.error as Error)?.message)}
          </p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="font-ui text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground">Project</th>
                <th className="px-4 py-3 text-right font-ui text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground">Due date</th>
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground">Issued</th>
                <th className="px-4 py-3 text-right font-ui text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const num = inv.number ?? inv.invoiceNumber ?? inv.id.slice(0, 6);
                return (
                  <tr
                    key={inv.id}
                    className="cursor-pointer border-b border-border last:border-b-0 hover:bg-subtle"
                    onClick={() => {
                      setSelected(inv);
                      setOpen(true);
                    }}
                  >
                    <td className="px-4 py-3 font-ui text-sm font-semibold text-ink">{num}</td>
                    <td className="px-4 py-3 font-ui text-sm text-ink">{projectsById.get(inv.projectId) ?? inv.projectId}</td>
                    <td className="px-4 py-3 text-right font-ui text-sm font-semibold text-ink">{ngn(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2 py-1 font-ui text-xs font-semibold", badge(inv.status))}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-ui text-sm text-ink">
                      {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 font-ui text-sm text-ink">
                      {inv.createdAt ? format(new Date(inv.createdAt), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.fileUrl ? (
                        <a
                          href={inv.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download
                        </a>
                      ) : (
                        <span className="font-ui text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceDetailSheet
        open={open}
        onOpenChange={setOpen}
        invoice={selected}
        projectName={selected ? (projectsById.get(selected.projectId) ?? selected.projectId) : undefined}
        mode="client"
      />
    </div>
  );
}

