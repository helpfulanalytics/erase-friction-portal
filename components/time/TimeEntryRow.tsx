"use client";

import * as React from "react";
import { Trash2, Save } from "lucide-react";

type User = { id: string; name?: string; email?: string };
type Project = { id: string; name?: string };
type Entry = {
  id: string;
  userId: string;
  projectId: string;
  description?: string;
  duration: number;
  date: string;
};

function minsToHHMM(mins: number) {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hhmmToMins(s: string) {
  const m = s.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function TimeEntryRow({
  entry,
  users,
  projects,
  onUpdate,
  onDelete,
}: {
  entry: Entry;
  users: User[];
  projects: Project[];
  onUpdate: (patch: Partial<Entry>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [date, setDate] = React.useState(entry.date);
  const [userId, setUserId] = React.useState(entry.userId);
  const [projectId, setProjectId] = React.useState(entry.projectId);
  const [desc, setDesc] = React.useState(entry.description ?? "");
  const [duration, setDuration] = React.useState(minsToHHMM(entry.duration));
  const [busy, setBusy] = React.useState(false);

  async function save() {
    const mins = hhmmToMins(duration);
    if (mins === null) return;
    setBusy(true);
    try {
      await onUpdate({
        date,
        userId,
        projectId,
        description: desc,
        duration: mins,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  const userName = users.find((u) => u.id === entry.userId)?.name ?? users.find((u) => u.id === entry.userId)?.email ?? entry.userId;
  const projectName = projects.find((p) => p.id === entry.projectId)?.name ?? entry.projectId;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3 font-ui text-sm text-ink">
        {editing ? (
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[140px] rounded-lg border border-border bg-surface px-2 font-ui text-sm"
          />
        ) : (
          entry.date
        )}
      </td>
      <td className="px-4 py-3 font-ui text-sm text-ink">
        {editing ? (
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-2 font-ui text-sm"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email ?? "Member"}
              </option>
            ))}
          </select>
        ) : (
          userName
        )}
      </td>
      <td className="px-4 py-3 font-ui text-sm text-ink">
        {editing ? (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-2 font-ui text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? "Project"}
              </option>
            ))}
          </select>
        ) : (
          projectName
        )}
      </td>
      <td className="px-4 py-3 font-headingAlt text-sm text-ink">
        {editing ? (
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface px-2 font-headingAlt text-sm"
          />
        ) : (
          entry.description ?? "—"
        )}
      </td>
      <td className="px-4 py-3 text-right font-ui text-sm text-ink">
        {editing ? (
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-9 w-[92px] rounded-lg border border-border bg-surface px-2 text-right font-ui text-sm"
            placeholder="HH:MM"
          />
        ) : (
          minsToHHMM(entry.duration)
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          {editing ? (
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-3 font-ui text-sm font-semibold text-ink disabled:opacity-50"
            >
              <Save className="size-4" />
              Save
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 font-ui text-sm font-semibold text-ink hover:bg-subtle"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

