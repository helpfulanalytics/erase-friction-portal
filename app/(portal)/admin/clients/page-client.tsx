"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import type { UserAvatarGender } from "@/types/models";

type ClientUser = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  avatar: string;
  avatarGender?: UserAvatarGender;
  createdAt?: number;
  projects: { id: string; name: string }[];
};

type PendingInvite = {
  id: string;
  email: string;
  name: string;
  company: string;
  projectIds: string[];
  expiresAt?: number;
  createdAt?: number;
};

type ProjectOption = { id: string; name: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function roleBadge(role: string) {
  if (role === "ADMIN")
    return { label: "Admin",     cls: "border-violet-300 bg-violet-50 text-violet-800" };
  if (role === "DEV")
    return { label: "Developer", cls: "border-amber-300 bg-amber-50 text-amber-800" };
  return { label: "Client", cls: "border-blue-300 bg-blue-50 text-blue-800" };
}

function InviteUserModal({
  open,
  onClose,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
}) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState<"CLIENT" | "ADMIN" | "DEV">("CLIENT");
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);

  const invite = useMutation({
    mutationFn: () =>
      fetchJson<{ success: boolean }>("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          company,
          role,
          projectIds: selectedProjects,
        }),
      }),
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      setEmail("");
      setName("");
      setCompany("");
      setRole("CLIENT");
      setSelectedProjects([]);
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send invite."),
  });

  function toggleProject(id: string) {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="font-headingAlt text-lg font-bold text-ink">Invite user</h2>
        <p className="mt-1 font-ui text-sm text-muted-foreground">
          Send an email invite. They&apos;ll get a link to join.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <div>
            <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="client@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Acme Inc"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
              Role
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                  role === "CLIENT"
                    ? "bg-brand text-ink"
                    : "border border-border bg-surface text-muted-foreground hover:bg-subtle"
                )}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                  role === "ADMIN"
                    ? "bg-violet-500 text-white"
                    : "border border-border bg-surface text-muted-foreground hover:bg-subtle"
                )}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("DEV")}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                  role === "DEV"
                    ? "bg-amber-500 text-white"
                    : "border border-border bg-surface text-muted-foreground hover:bg-subtle"
                )}
              >
                Dev
              </button>
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <label className="mb-1 block font-ui text-xs font-semibold text-muted-foreground">
                Assign to projects
              </label>
              <div className="max-h-36 space-y-1 overflow-auto rounded-xl border border-border bg-subtle p-2">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="size-3.5 rounded border-border accent-brand"
                    />
                    <span className="font-ui text-sm text-ink">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              disabled={!email.trim() || !name.trim() || invite.isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            >
              {invite.isPending ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminClientsClient() {
  const q = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: () =>
      fetchJson<{ clients: ClientUser[]; pendingInvites: PendingInvite[] }>(
        "/api/admin/clients"
      ),
  });

  const projectsQ = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () =>
      fetchJson<{ projects: ProjectOption[] }>("/api/admin/projects"),
  });

  const [tab, setTab] = React.useState<"users" | "invites">("users");
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const clients = q.data?.clients ?? [];
  const invites = q.data?.pendingInvites ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink">
            Clients
          </h1>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            {clients.length} users, {invites.length} pending invites
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("users")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                tab === "users"
                  ? "bg-brand text-ink"
                  : "border border-border bg-surface text-muted-foreground hover:bg-subtle hover:text-ink"
              )}
            >
              Users ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("invites")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-ui text-xs font-semibold transition-colors",
                tab === "invites"
                  ? "bg-brand text-ink"
                  : "border border-border bg-surface text-muted-foreground hover:bg-subtle hover:text-ink"
              )}
            >
              Pending ({invites.length})
            </button>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink"
          >
            + Invite user
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
      ) : tab === "users" ? (
        clients.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="font-headingAlt text-lg font-bold text-ink">No users yet</div>
            <p className="mt-1 font-ui text-sm text-muted-foreground">
              Send an invite to add your first client.
            </p>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-5 font-ui text-sm font-semibold text-ink"
            >
              + Invite user
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => {
              const badge = roleBadge(c.role);
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-surface p-5 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={resolveUserAvatarUrl(c.avatar, c.id || c.email, { gender: c.avatarGender })}
                      alt=""
                      className="size-10 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-headingAlt text-sm font-bold text-ink">
                          {c.name || c.email.split("@")[0]}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold",
                            badge.cls
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-ui text-xs text-muted-foreground">
                        {c.email}
                      </div>
                      {c.company && (
                        <div className="mt-0.5 font-ui text-xs text-muted-foreground">
                          {c.company}
                        </div>
                      )}
                    </div>
                  </div>

                  {c.projects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {c.projects.map((p) => (
                        <span
                          key={p.id}
                          className="rounded-md border border-border bg-subtle px-2 py-0.5 font-ui text-[10px] font-semibold text-muted-foreground"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 font-ui text-[11px] text-muted-foreground">
                    Joined{" "}
                    {c.createdAt
                      ? formatDistanceToNowStrict(new Date(c.createdAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : invites.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="font-headingAlt text-lg font-bold text-ink">
            No pending invites
          </div>
          <p className="mt-1 font-ui text-sm text-muted-foreground">
            All invites have been accepted or expired.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Email
                </th>
                <th className="hidden px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground sm:table-cell">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground md:table-cell">
                  Company
                </th>
                <th className="hidden px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground lg:table-cell">
                  Sent
                </th>
                <th className="px-4 py-3 text-left font-ui text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-b-0 hover:bg-subtle transition-colors"
                >
                  <td className="px-4 py-3 font-headingAlt text-sm font-semibold text-ink">
                    {inv.email}
                  </td>
                  <td className="hidden px-4 py-3 font-ui text-sm text-ink sm:table-cell">
                    {inv.name || "—"}
                  </td>
                  <td className="hidden px-4 py-3 font-ui text-sm text-muted-foreground md:table-cell">
                    {inv.company || "—"}
                  </td>
                  <td className="hidden px-4 py-3 font-ui text-sm text-muted-foreground lg:table-cell">
                    {inv.createdAt
                      ? format(new Date(inv.createdAt), "dd MMM yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-ui text-sm text-muted-foreground">
                    {inv.expiresAt
                      ? formatDistanceToNowStrict(new Date(inv.expiresAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projects={projectsQ.data?.projects ?? []}
      />
    </div>
  );
}
