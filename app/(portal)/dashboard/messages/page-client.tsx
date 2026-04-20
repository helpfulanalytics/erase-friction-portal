"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, orderBy, query, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Project = { id: string; name?: string };
type Msg = {
  id: string;
  projectId: string;
  userId: string;
  userRole?: "ADMIN" | "CLIENT";
  body: string;
  createdAt?: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

function msgFromDoc(d: QueryDocumentSnapshot): Msg {
  const data = d.data() as Record<string, unknown>;
  const createdAt = (data.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  return {
    id: d.id,
    projectId: String(data.projectId ?? ""),
    userId: String(data.userId ?? ""),
    userRole: (data.userRole as Msg["userRole"]) ?? undefined,
    body: String(data.body ?? ""),
    createdAt: createdAt ?? undefined,
  };
}

export default function MessagesClient() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");

  const projectsQ = useQuery({
    queryKey: ["projects", "me"],
    queryFn: () => fetchJson<{ projects: Project[] }>("/api/projects"),
  });

  const projects = React.useMemo(() => projectsQ.data?.projects ?? [], [projectsQ.data]);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(projectIdFromUrl);

  React.useEffect(() => {
    if (projectIdFromUrl) setActiveProjectId(projectIdFromUrl);
  }, [projectIdFromUrl]);

  React.useEffect(() => {
    if (!activeProjectId && projects.length > 0) setActiveProjectId(projects[0]!.id);
  }, [activeProjectId, projects]);

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);

  React.useEffect(() => {
    if (!activeProjectId) return;
    setLoadingThread(true);

    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "messages"),
          where("projectId", "==", activeProjectId),
          orderBy("createdAt", "asc")
        );
        unsubSnap = onSnapshot(
          q,
          (snap) => {
            setMessages(snap.docs.map(msgFromDoc));
            setLoadingThread(false);
          },
          (err) => {
            console.error(err);
            setLoadingThread(false);
          }
        );
      } else {
        if (unsubSnap) {
          unsubSnap();
          unsubSnap = undefined;
        }
        setMessages([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [activeProjectId]);

  const [text, setText] = React.useState("");

  const send = useMutation({
    mutationFn: async () => {
      if (!activeProjectId) throw new Error("Select a project first.");
      const body = text.trim();
      if (!body) return;
      setText("");
      await fetchJson(`/api/messages/${activeProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send."),
  });

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-4 py-3">
          <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Projects
          </div>
        </div>
        <div className="p-2">
          {projectsQ.isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projectsQ.error ? (
            <div className="p-4 font-ui text-sm text-destructive">
              {(projectsQ.error as Error).message}
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 font-ui text-sm text-muted-foreground">
              No projects yet.
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p) => {
                const isActive = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProjectId(p.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left font-headingAlt text-sm",
                      isActive
                        ? "bg-brand/10 text-ink"
                        : "text-muted-foreground hover:bg-subtle hover:text-ink"
                    )}
                  >
                    {p.name ?? "Project"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-headingAlt text-base font-bold text-ink">
                {activeProject?.name ?? "Messages"}
              </div>
              <div className="font-ui text-xs text-muted-foreground">
                Real-time thread
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-4">
          {loadingThread ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-12 w-1/2" />
              <Skeleton className="h-12 w-2/3" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-border bg-subtle p-4 font-ui text-sm text-muted-foreground">
              No messages yet. Say hello.
            </div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.userRole === "ADMIN";
              const when = m.createdAt
                ? formatDistanceToNowStrict(new Date(m.createdAt), { addSuffix: true })
                : "";
              return (
                <div
                  key={m.id}
                  className={cn("flex", isAdmin ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[min(520px,85%)] rounded-2xl border border-border bg-surface px-4 py-3",
                      isAdmin ? "border-l-4 border-l-brand" : "text-right"
                    )}
                  >
                    <div className="font-headingAlt text-sm text-ink">{m.body}</div>
                    <div className="mt-1 font-ui text-[11px] text-muted-foreground">
                      {when}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 font-headingAlt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="Write a message…"
            />
            <button
              type="submit"
              disabled={!text.trim() || send.isPending || !activeProjectId}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 font-ui text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

