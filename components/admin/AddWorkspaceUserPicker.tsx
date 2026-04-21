"use client";

import * as React from "react";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import type { UserAvatarGender } from "@/types/models";

export type WorkspaceUserOption = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  avatarGender?: UserAvatarGender;
};

function userLabel(u: WorkspaceUserOption) {
  const primary = u.name?.trim() || u.email?.trim() || u.id;
  const secondary = u.email && u.name?.trim() ? u.email : null;
  return { primary, secondary };
}

function userInitials(u: WorkspaceUserOption) {
  const n = (u.name?.trim() || u.email?.trim() || "?").replace(/\s+/g, " ");
  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "?";
}

export function AddWorkspaceUserPicker({
  users,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  users: WorkspaceUserOption[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = users.find((u) => u.id === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.name ?? ""} ${u.email ?? ""} ${u.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 min-w-0 flex-1 justify-between gap-2 px-3 font-ui shadow-sm",
              !selected && "text-muted-foreground"
            )}
            aria-expanded={open}
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          {selected ? (
            <>
              <Avatar size="sm" className="size-7 shrink-0 ring-2 ring-border/60">
                <AvatarImage
                  src={resolveUserAvatarUrl(selected.avatar, selected.id, {
                    gender: selected.avatarGender,
                  })}
                  alt={userLabel(selected).primary}
                />
                <AvatarFallback className="font-ui text-[10px] font-bold">
                  {userInitials(selected)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {userLabel(selected).primary}
                </span>
                {userLabel(selected).secondary ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {userLabel(selected).secondary}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <span className="truncate text-sm">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,22rem)] max-w-[min(100vw-2rem,24rem)] p-0"
        sideOffset={4}
      >
        <div className="border-b border-border px-2 py-1.5">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-subtle/50 px-2">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="h-8 border-0 bg-transparent font-ui text-sm shadow-none focus-visible:ring-0"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center font-ui text-sm text-muted-foreground">No matches.</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((u) => {
                const { primary, secondary } = userLabel(u);
                const active = value === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(u.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                        active
                          ? "bg-brand/15 ring-1 ring-brand/30"
                          : "hover:bg-muted/80"
                      )}
                    >
                      <Avatar size="sm" className="size-9 shrink-0 ring-2 ring-border/50">
                        <AvatarImage
                          src={resolveUserAvatarUrl(u.avatar, u.id, { gender: u.avatarGender })}
                          alt={primary}
                        />
                        <AvatarFallback className="font-ui text-xs font-semibold">
                          {userInitials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-ui text-sm font-semibold text-ink">
                          {primary}
                        </span>
                        {secondary ? (
                          <span className="block truncate font-ui text-xs text-muted-foreground">
                            {secondary}
                          </span>
                        ) : u.email && !u.name?.trim() ? (
                          <span className="block truncate font-ui text-xs text-muted-foreground">
                            {u.email}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
