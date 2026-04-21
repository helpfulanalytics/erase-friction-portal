"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict, startOfMonth, startOfWeek, addDays, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem";
import { AssetLibrary } from "@/components/assets/AssetLibrary";
import { InvoiceDetailSheet, type Invoice } from "@/components/invoices/InvoiceDetailSheet";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import type { UserAvatarGender } from "@/types/models";
import { AddWorkspaceUserPicker } from "@/components/admin/AddWorkspaceUserPicker";

type Event = {
  id: string;
  actorName?: string;
  actorEmail?: string;
  description?: string;
  type?: string;
  meta?: Record<string, unknown>;
  createdAt?: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

type ProjectMemberRow = {
  membershipId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  avatarGender?: UserAvatarGender;
};

function memberInitials(name: string, email: string) {
  const n = (name.trim() || email.trim() || "?").replace(/\s+/g, " ");
  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase() || "?";
}

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function AdminProjectOverview({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["activity", "project", projectId],
    queryFn: () => fetchJson<{ events: Event[] }>(`/api/projects/${projectId}/activity?limit=200`),
  });

  const teamQ = useQuery({
    queryKey: ["admin-team"],
    queryFn: () =>
      fetchJson<{
        users: { id: string; name?: string; email?: string; avatar?: string; avatarGender?: UserAvatarGender }[];
        projects: { id: string; name?: string }[];
      }>("/api/admin/team"),
  });

  const membersQ = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchJson<{ members: ProjectMemberRow[] }>(`/api/projects/${projectId}/members`),
  });

  const memberUserIds = React.useMemo(() => {
    return new Set((membersQ.data?.members ?? []).map((m) => m.userId));
  }, [membersQ.data?.members]);

  const [pickUserId, setPickUserId] = React.useState<string>("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"ADMIN" | "CLIENT">("CLIENT");
  const [addingMember, setAddingMember] = React.useState(false);

  const teamUsersNotOnProject = React.useMemo(() => {
    return (teamQ.data?.users ?? []).filter((u) => !memberUserIds.has(u.id));
  }, [teamQ.data?.users, memberUserIds]);

  const workspaceUserCount = teamQ.data?.users?.length ?? 0;
  const addExistingPlaceholder = teamQ.isLoading
    ? "Loading people…"
    : workspaceUserCount === 0
      ? "No accounts in workspace yet"
      : teamUsersNotOnProject.length === 0
        ? "Everyone is already on this project"
        : "Choose someone to add…";

  const usersById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of teamQ.data?.users ?? []) {
      map.set(u.id, u.name ?? u.email ?? u.id);
    }
    return map;
  }, [teamQ.data?.users]);

  const projects = teamQ.data?.projects ?? [];

  const invoicesQ = useQuery({
    queryKey: ["invoices", "project", projectId],
    queryFn: () => fetchJson<{ invoices: Invoice[] }>(`/api/projects/${projectId}/invoices`),
  });
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  async function updateInvoice(id: string, patch: Partial<Pick<Invoice, "status" | "fileUrl">> & { storagePath?: string | null }) {
    await fetchJson(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    await invoicesQ.refetch();
  }

  async function deleteInvoice(id: string) {
    const ok = window.confirm("Delete this invoice? This cannot be undone.");
    if (!ok) return;
    await fetchJson(`/api/invoices/${id}`, { method: "DELETE" });
    toast.success("Invoice deleted.");
    await invoicesQ.refetch();
  }

  async function uploadReplacePdf(inv: Invoice) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const number = inv.number ?? inv.invoiceNumber ?? inv.id.slice(0, 6);
      const form = new FormData();
      form.set("projectId", inv.projectId);
      form.set("invoiceNumber", number);
      form.set("file", file);
      const res = await fetch("/api/uploads/invoice-pdf", { method: "POST", body: form, credentials: "include" });
      const data = (await res.json()) as { url?: string; path?: string; error?: string };
      if (!res.ok) return toast.error(data.error ?? "Upload failed");
      await updateInvoice(inv.id, { fileUrl: data.url ?? null, storagePath: data.path ?? null });
      toast.success("PDF uploaded.");
    };
    input.click();
  }

  const weekStart = React.useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekFrom = ymd(weekStart);
  const weekTo = ymd(addDays(weekStart, 6));
  const monthFrom = ymd(startOfMonth(new Date()));
  const monthTo = ymd(new Date());

  const timeWeekQ = useQuery({
    queryKey: ["time", "project", projectId, "week", weekFrom, weekTo],
    queryFn: () => fetchJson<{ entries: { duration: number }[] }>(`/api/time?projectId=${encodeURIComponent(projectId)}&from=${weekFrom}&to=${weekTo}&limit=2000`),
  });

  const timeMonthQ = useQuery({
    queryKey: ["time", "project", projectId, "month", monthFrom, monthTo],
    queryFn: () => fetchJson<{ entries: { duration: number }[] }>(`/api/time?projectId=${encodeURIComponent(projectId)}&from=${monthFrom}&to=${monthTo}&limit=2000`),
  });

  const weekMins = (timeWeekQ.data?.entries ?? []).reduce((sum, e) => sum + (Number(e.duration ?? 0) || 0), 0);
  const monthMins = (timeMonthQ.data?.entries ?? []).reduce((sum, e) => sum + (Number(e.duration ?? 0) || 0), 0);
  const weekHours = (weekMins / 60).toFixed(1);
  const monthHours = (monthMins / 60).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h1 className="font-headingAlt text-2xl font-bold text-ink">Project</h1>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Quick links for this project.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/admin/projects/${projectId}/docs`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            Docs
          </Link>
          <Link
            href={`/admin/projects/${projectId}/tasks`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            Tasks
          </Link>
          <Link
            href={`/admin/time?projectId=${encodeURIComponent(projectId)}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            Time
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-subtle p-4">
            <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              This week
            </div>
            <div className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink">
              {timeWeekQ.isLoading ? "…" : weekHours}
            </div>
            <div className="mt-1 font-ui text-xs text-muted-foreground">
              hours ({weekFrom}–{weekTo})
            </div>
          </div>
          <div className="rounded-xl border border-border bg-subtle p-4">
            <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              This month
            </div>
            <div className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink">
              {timeMonthQ.isLoading ? "…" : monthHours}
            </div>
            <div className="mt-1 font-ui text-xs text-muted-foreground">
              hours ({monthFrom}–{monthTo})
            </div>
          </div>
        </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-headingAlt text-lg font-bold tracking-tight text-ink">People</h2>
              <p className="mt-0.5 max-w-xl font-ui text-sm text-muted-foreground">
                Add anyone who already has a portal account, or email an invite. New invites only get access to this project once they accept.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-subtle/35 p-4">
              <div className="font-ui text-xs font-bold uppercase tracking-wider text-ink/80">Add existing</div>
              <p className="mt-1 font-ui text-xs text-muted-foreground">
                Pick from everyone in your workspace.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <AddWorkspaceUserPicker
                  users={teamUsersNotOnProject}
                  value={pickUserId}
                  onChange={setPickUserId}
                  disabled={teamQ.isLoading || teamUsersNotOnProject.length === 0}
                  placeholder={addExistingPlaceholder}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 shrink-0 px-4 font-ui font-semibold"
                  disabled={!pickUserId || addingMember}
                  onClick={async () => {
                    if (!pickUserId) return;
                    setAddingMember(true);
                    try {
                      await fetchJson(`/api/projects/${projectId}/members`, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ userId: pickUserId }),
                      });
                      toast.success("User added to project.");
                      setPickUserId("");
                      await queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
                      await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not add user");
                    } finally {
                      setAddingMember(false);
                    }
                  }}
                >
                  Add to project
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-subtle/35 p-4">
              <div className="font-ui text-xs font-bold uppercase tracking-wider text-ink/80">Email invite</div>
              <p className="mt-1 font-ui text-xs text-muted-foreground">
                They’ll receive a link to sign up and join this project.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Input
                  className="h-9 font-ui text-sm shadow-sm"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-[140px]"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value === "ADMIN" ? "ADMIN" : "CLIENT")}
                  >
                    <option value="CLIENT">Role: Client</option>
                    <option value="ADMIN">Role: Admin</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0 px-4 font-ui font-semibold sm:ml-auto"
                    disabled={!inviteEmail.trim() || addingMember}
                    onClick={async () => {
                      setAddingMember(true);
                      try {
                        await fetchJson(`/api/projects/${projectId}/members`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            email: inviteEmail.trim(),
                            name: "",
                            company: "",
                            role: inviteRole,
                          }),
                        });
                        toast.success("Invite sent.");
                        setInviteEmail("");
                        await queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
                        await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Invite failed");
                      } finally {
                        setAddingMember(false);
                      }
                    }}
                  >
                    Send invite
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="font-ui text-xs font-bold uppercase tracking-wider text-muted-foreground">
              On this project
            </div>
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto pr-1">
            {membersQ.isLoading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-border bg-subtle/40 p-3"
                  >
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : membersQ.error ? (
              <div className="rounded-xl border border-border bg-subtle/40 p-4 font-ui text-sm text-destructive">
                {(membersQ.error as Error).message}
              </div>
            ) : (membersQ.data?.members?.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-subtle/20 p-8 text-center font-ui text-sm text-muted-foreground">
                No one on this project yet. Add someone above or send an invite.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {membersQ.data!.members.map((m) => {
                  const avatarUrl = resolveUserAvatarUrl(m.avatar, m.userId, {
                    gender: m.avatarGender,
                  });
                  return (
                    <div
                      key={m.membershipId}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/90 bg-gradient-to-br from-surface to-subtle/40 p-3.5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]"
                    >
                      <Avatar size="lg" className="size-10 shrink-0 ring-2 ring-border/60">
                        <AvatarImage src={avatarUrl} alt={m.name} />
                        <AvatarFallback className="font-ui text-xs font-semibold">
                          {memberInitials(m.name, m.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-ui text-sm font-semibold text-ink">{m.name}</div>
                        <div className="truncate font-ui text-xs text-muted-foreground">
                          {m.email || m.userId}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wide",
                          m.role === "ADMIN"
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : m.role === "DEV"
                              ? "border-violet-300 bg-violet-50 text-violet-900"
                              : "border-border bg-surface text-muted-foreground"
                        )}
                      >
                        {m.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Assets
          </div>
          <div className="mt-4">
            <AssetLibrary
              mode="admin"
              projects={projects.filter((p) => p.id === projectId)}
              usersById={usersById}
              defaultProjectId={projectId}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Invoices
            </div>
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-3 font-ui text-sm font-semibold text-ink"
            >
              Create invoice
            </button>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-border bg-subtle">
                  <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">Invoice #</th>
                  <th className="px-4 py-2 text-right font-ui text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-ui text-xs font-semibold text-muted-foreground">Due</th>
                  <th className="px-4 py-2 text-right font-ui text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoicesQ.isLoading ? (
                  <tr><td colSpan={5} className="p-4"><Skeleton className="h-16 w-full" /></td></tr>
                ) : invoicesQ.error ? (
                  <tr><td colSpan={5} className="p-4 font-ui text-sm text-destructive">{(invoicesQ.error as Error).message}</td></tr>
                ) : (invoicesQ.data?.invoices?.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="p-4 font-ui text-sm text-muted-foreground">No invoices yet.</td></tr>
                ) : (
                  invoicesQ.data!.invoices.map((inv) => {
                    const num = inv.number ?? inv.invoiceNumber ?? inv.id.slice(0, 6);
                    return (
                      <tr
                        key={inv.id}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-subtle"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setDetailOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 font-ui text-sm font-semibold text-ink">{num}</td>
                        <td className="px-4 py-3 text-right font-ui text-sm font-semibold text-ink">
                          {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(inv.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full border px-2 py-1 font-ui text-xs font-semibold",
                            inv.status === "PAID" ? "border-emerald-300 bg-emerald-50 text-emerald-800" :
                            inv.status === "OVERDUE" ? "border-red-300 bg-red-50 text-red-800" :
                            "border-amber-300 bg-amber-50 text-amber-900"
                          )}>{inv.status}</span>
                        </td>
                        <td className="px-4 py-3 font-ui text-sm text-ink">
                          {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                              onClick={() => updateInvoice(inv.id, { status: "PAID" })}
                            >
                              Mark paid
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                              onClick={() => uploadReplacePdf(inv)}
                            >
                              Upload PDF
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
                              onClick={() => deleteInvoice(inv.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <CreateInvoiceModal
            open={invoiceOpen}
            onOpenChange={setInvoiceOpen}
            projects={projects.filter((p) => p.id === projectId)}
            defaultProjectId={projectId}
            onCreated={async () => {
              await invoicesQ.refetch();
            }}
          />

          <InvoiceDetailSheet
            open={detailOpen}
            onOpenChange={setDetailOpen}
            invoice={selectedInvoice}
            projectName={projects.find((p) => p.id === projectId)?.name ?? projectId}
            mode="admin"
            onStatusChange={async (status) => {
              if (!selectedInvoice) return;
              await updateInvoice(selectedInvoice.id, { status });
              setSelectedInvoice((prev) => (prev ? { ...prev, status } : prev));
            }}
          />
        </div>
      </section>

      <aside className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Activity
        </div>
        <div className="mt-4 space-y-4">
          {q.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : q.error ? (
            <div className="font-ui text-sm text-destructive">{(q.error as Error).message}</div>
          ) : (q.data?.events?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-muted-foreground">
              No activity yet.
            </div>
          ) : (
            q.data!.events.map((e) => {
              const name = e.actorName ?? e.actorEmail ?? "User";
              const when = e.createdAt
                ? formatDistanceToNowStrict(new Date(e.createdAt), { addSuffix: true })
                : "";
              return (
                <div key={e.id} className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <ActivityFeedItem
                    name={name}
                    description={e.description ?? ""}
                    when={when}
                    type={e.type}
                    meta={e.meta}
                  />
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

