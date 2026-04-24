"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Project = { id: string; name?: string };
type Task = { id: string; title?: string };

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hhmmToMins(s: string) {
  const m = s.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function LogTimeModal({
  open,
  onOpenChange,
  projects,
  tasks,
  defaultProjectId,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  defaultProjectId?: string | null;
  userId: string;
}) {
  const [date, setDate] = React.useState(() => toYMD(new Date()));
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? (projects[0]?.id ?? ""));
  const [taskId, setTaskId] = React.useState<string>("NONE");
  const [duration, setDuration] = React.useState("01:00");
  const [description, setDescription] = React.useState("");
  const [repoFullName, setRepoFullName] = React.useState<string>("");
  const [commitSha, setCommitSha] = React.useState<string>("");
  const [commitUrl, setCommitUrl] = React.useState<string>("");
  const [prNumber, setPrNumber] = React.useState<number | null>(null);
  const [prUrl, setPrUrl] = React.useState<string>("");
  const [repos, setRepos] = React.useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<{
    commits: Array<{ repoFullName: string; sha: string; url: string; message: string; date: string }>;
    prs: Array<{ repoFullName: string; number: number; url: string; title: string; state: string; updatedAt: string }>;
  }>({ commits: [], prs: [] });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!projectId && projects[0]?.id) setProjectId(projects[0].id);
  }, [open, projectId, projects]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ connected: boolean; repos: string[] }>("/api/integrations/github/repos");
        if (cancelled) return;
        setRepos(res.repos ?? []);
      } catch {
        if (!cancelled) setRepos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function loadSuggestions() {
    if (!repoFullName) return;
    setSuggestBusy(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const qs = new URLSearchParams({ repoFullName, since, includePrs: "1" });
      const res = await fetchJson<{ commits: typeof suggestions.commits; prs: typeof suggestions.prs }>(
        `/api/integrations/github/suggestions?${qs.toString()}`
      );
      setSuggestions({ commits: res.commits ?? [], prs: res.prs ?? [] });
    } catch (e) {
      setSuggestions({ commits: [], prs: [] });
      toast.error(e instanceof Error ? e.message : "Failed to load GitHub suggestions.");
    } finally {
      setSuggestBusy(false);
    }
  }

  async function submit() {
    const mins = hhmmToMins(duration);
    if (mins === null) {
      toast.error("Duration must be HH:MM");
      return;
    }
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    setBusy(true);
    try {
      await fetchJson("/api/time", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description,
          duration: mins,
          date,
          startTime: null,
          endTime: null,
          source: "manual",
          repoFullName: repoFullName || null,
          commitSha: commitSha || null,
          commitUrl: commitUrl || null,
          prNumber,
          prUrl: prUrl || null,
        }),
      });
      toast.success("Time logged.");
      onOpenChange(false);
      setDescription("");
      setRepoFullName("");
      setCommitSha("");
      setCommitUrl("");
      setPrNumber(null);
      setPrUrl("");
      setSuggestions({ commits: [], prs: [] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log time.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
          <DialogDescription>Add a manual time entry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Date</div>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label className="space-y-1">
              <div className="font-ui text-xs font-semibold text-muted-foreground">Duration (HH:MM)</div>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
              />
            </label>
          </div>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Project</div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Project"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Task (optional)</div>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
            >
              <option value="NONE">No task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title ?? "Task"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="font-ui text-xs font-semibold text-muted-foreground">Description</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-headingAlt text-sm text-ink"
              placeholder="What did you work on?"
            />
          </label>

          <div className="rounded-xl border border-border bg-subtle p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                GitHub (optional)
              </div>
              <button
                type="button"
                onClick={loadSuggestions}
                disabled={!repoFullName || suggestBusy}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-xs font-semibold text-ink disabled:opacity-50"
              >
                {suggestBusy ? "Loading…" : "Get suggestions"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="space-y-1">
                <div className="font-ui text-xs font-semibold text-muted-foreground">Repo</div>
                {repos.length ? (
                  <select
                    value={repoFullName}
                    onChange={(e) => setRepoFullName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                  >
                    <option value="">Select repo…</option>
                    {repos.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={repoFullName}
                    onChange={(e) => setRepoFullName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                    placeholder="owner/repo"
                  />
                )}
              </label>

              <label className="space-y-1">
                <div className="font-ui text-xs font-semibold text-muted-foreground">Link type</div>
                <select
                  value={commitSha ? "commit" : prNumber ? "pr" : "none"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "commit") {
                      setPrNumber(null);
                      setPrUrl("");
                    } else if (v === "pr") {
                      setCommitSha("");
                      setCommitUrl("");
                    } else {
                      setCommitSha("");
                      setCommitUrl("");
                      setPrNumber(null);
                      setPrUrl("");
                    }
                  }}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink"
                >
                  <option value="none">None</option>
                  <option value="commit">Commit</option>
                  <option value="pr">Pull request</option>
                </select>
              </label>
            </div>

            {commitSha ? (
              <div className="mt-2 font-ui text-xs text-muted-foreground">
                Attached commit: <span className="font-semibold text-ink">{commitSha.slice(0, 8)}</span>
              </div>
            ) : prNumber ? (
              <div className="mt-2 font-ui text-xs text-muted-foreground">
                Attached PR: <span className="font-semibold text-ink">#{prNumber}</span>
              </div>
            ) : null}

            {(suggestions.commits.length || suggestions.prs.length) && repoFullName ? (
              <div className="mt-3 space-y-2">
                {suggestions.commits.length ? (
                  <div>
                    <div className="font-ui text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                      Commits
                    </div>
                    <div className="mt-1 space-y-1">
                      {suggestions.commits.slice(0, 6).map((c) => (
                        <button
                          key={c.sha}
                          type="button"
                          onClick={() => {
                            setCommitSha(c.sha);
                            setCommitUrl(c.url);
                            setPrNumber(null);
                            setPrUrl("");
                          }}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-subtle"
                        >
                          <div className="font-ui text-xs font-semibold text-ink">
                            {c.message || c.sha.slice(0, 8)}
                          </div>
                          <div className="font-ui text-xs text-muted-foreground">
                            {c.sha.slice(0, 8)} • {new Date(c.date).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggestions.prs.length ? (
                  <div>
                    <div className="font-ui text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                      Pull requests
                    </div>
                    <div className="mt-1 space-y-1">
                      {suggestions.prs.slice(0, 6).map((p) => (
                        <button
                          key={p.number}
                          type="button"
                          onClick={() => {
                            setPrNumber(p.number);
                            setPrUrl(p.url);
                            setCommitSha("");
                            setCommitUrl("");
                          }}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-subtle"
                        >
                          <div className="font-ui text-xs font-semibold text-ink">
                            #{p.number} {p.title}
                          </div>
                          <div className="font-ui text-xs text-muted-foreground">
                            {p.state} • Updated {new Date(p.updatedAt).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

