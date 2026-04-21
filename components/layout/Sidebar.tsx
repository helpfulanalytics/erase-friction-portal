"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  Receipt,
  Package,
  Bell,
  Layers,
  Users,
  BarChart2,
  Clock,
  Wrench,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  Play,
  Square,
  Timer,
  Pin,
  PinOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveUserAvatarUrl } from "@/lib/user-avatar-url";
import type { UserAvatarGender } from "@/types/models";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover-base";

/* ─── Types ──────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  children?: NavItem[];
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/* ─── Nav config ─────────────────────────────────────────────── */

const CLIENT_SECTION: NavSection = {
  id: "workspace",
  label: "Workspace",
  items: [
    { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, shortcut: "G D" },
    { href: "/projects",      label: "Projects",      icon: FolderOpen,      shortcut: "G P" },
    { href: "/docs",          label: "Docs",          icon: FileText,        shortcut: "G O" },
    { href: "/messages",      label: "Messages",      icon: MessageSquare,   shortcut: "G M" },
    { href: "/invoices",      label: "Invoices",      icon: Receipt,         shortcut: "G I" },
    { href: "/assets",        label: "Assets",        icon: Package,         shortcut: "G A" },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ],
};

const ADMIN_SECTION: NavSection = {
  id: "admin",
  label: "Admin",
  items: [
    { href: "/admin/projects",  label: "All Projects", icon: Layers },
    { href: "/admin/clients",   label: "Clients",      icon: Users },
    { href: "/admin/analytics", label: "Analytics",    icon: BarChart2 },
    { href: "/dev/time",        label: "Time",         icon: Clock },
    { href: "/admin/dev",       label: "Dev tools",    icon: Wrench },
  ],
};

const DEV_SECTION: NavSection = {
  id: "dev",
  label: "Dev",
  items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D" },
    { href: "/dev/time",  label: "Time",       icon: Clock },
    { href: "/projects",  label: "Projects",   icon: FolderOpen,     shortcut: "G P" },
    { href: "/messages",  label: "Messages",   icon: MessageSquare,  shortcut: "G M" },
  ],
};

/* ─── Compact Timer ──────────────────────────────────────────── */

type TimerProject = { id: string; name?: string };
type TimerTask    = { id: string; title?: string };

function formatHMS(ms: number) {
  const s  = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function CompactTimer({
  userId,
  projects,
  isExpanded,
}: {
  userId: string;
  projects: TimerProject[];
  isExpanded: boolean;
}) {
  const [running,   setRunning]   = React.useState(false);
  const [startMs,   setStartMs]   = React.useState<number | null>(null);
  const [nowMs,     setNowMs]     = React.useState(() => Date.now());
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");
  const [tasks,     setTasks]     = React.useState<TimerTask[]>([]);
  const [taskId,    setTaskId]    = React.useState("NONE");
  const [desc,      setDesc]      = React.useState("");
  const [open,      setOpen]      = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ tasks: t }) => { if (!cancelled) setTasks(t ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const elapsed = running && startMs ? nowMs - startMs : 0;

  function start() {
    setStartMs(Date.now());
    setNowMs(Date.now());
    setRunning(true);
    setOpen(false);
  }

  async function stop() {
    if (!startMs) return;
    const end  = Date.now();
    const date = new Date(end).toISOString().slice(0, 10);
    setRunning(false);
    try {
      await fetch("/api/time", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          taskId: taskId === "NONE" ? null : taskId,
          description: desc,
          startTime: startMs,
          endTime: end,
          duration: null,
          date,
        }),
      });
    } finally {
      setStartMs(null);
      setDesc("");
      setTaskId("NONE");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.05] focus-visible:outline-none",
        )}
      >
        {/* Indicator dot */}
        <span className="relative flex size-4 shrink-0 items-center justify-center">
          <span
            className={cn(
              "size-2 rounded-full transition-colors",
              running ? "bg-brand" : "bg-white/20",
            )}
          />
          {running && (
            <span className="absolute size-2 animate-ping rounded-full bg-brand/50" />
          )}
        </span>

        {/* Elapsed + label — visible when expanded */}
        <span
          className={cn(
            "flex flex-1 items-center justify-between overflow-hidden transition-all duration-200",
            isExpanded ? "w-auto opacity-100" : "w-0 opacity-0",
          )}
        >
          <span className="font-mono text-[12px] tabular-nums text-zinc-400">
            {running ? formatHMS(elapsed) : "00:00:00"}
          </span>
          <span className="font-ui text-[10px] uppercase tracking-widest text-zinc-600">
            Timer
          </span>
        </span>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={12}
        className="w-[300px] border border-white/[0.08] bg-[#1a1a1d] p-4 font-ui shadow-2xl"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
          Time tracker
        </p>

        {/* Elapsed display */}
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
          <span
            className={cn(
              "size-2 rounded-full",
              running ? "bg-brand" : "bg-zinc-700",
            )}
          />
          {running && (
            <span className="absolute size-2 animate-ping rounded-full bg-brand/40" />
          )}
          <span className="font-mono text-2xl tabular-nums text-white">
            {formatHMS(elapsed)}
          </span>
        </div>

        <div className="space-y-2">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={running}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] text-zinc-300 focus:outline-none disabled:opacity-50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1a1a1d]">
                {p.name ?? "Project"}
              </option>
            ))}
          </select>

          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={running}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] text-zinc-300 focus:outline-none disabled:opacity-50"
          >
            <option value="NONE" className="bg-[#1a1a1d]">No task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#1a1a1d]">
                {t.title ?? "Task"}
              </option>
            ))}
          </select>

          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={running}
            placeholder="What are you working on?"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          onClick={running ? stop : start}
          className={cn(
            "mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-semibold transition-all duration-150",
            running
              ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
              : "bg-brand text-black hover:opacity-90",
          )}
        >
          {running ? (
            <><Square className="size-3.5" /> Stop</>
          ) : (
            <><Play className="size-3.5" /> Start timer</>
          )}
        </button>
      </PopoverContent>
    </Popover>
  );
}

/* ─── Nav Item ───────────────────────────────────────────────── */

function SidebarItem({
  item,
  isExpanded,
  depth = 0,
  onNavigate,
}: {
  item: NavItem;
  isExpanded: boolean;
  depth?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  const hasChildren = item.children && item.children.length > 0;
  const anyChildActive = item.children?.some((c) =>
    pathname === c.href || pathname.startsWith(c.href + "/")
  );

  return (
    <div>
      <Link
        href={item.href}
        onClick={hasChildren
          ? (e) => { e.preventDefault(); setOpen((o) => !o); }
          : () => { if (item.href !== pathname) onNavigate?.(); }
        }
        className={cn(
          "group relative flex cursor-pointer items-center gap-2.5 rounded-lg py-1.5 text-[13.5px] font-medium transition-all duration-150",
          depth === 0 ? "px-2" : "pl-6 pr-2",
          isActive || anyChildActive
            ? "bg-white/[0.07] text-white"
            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
        )}
      >
        {/* Active bar */}
        {(isActive || anyChildActive) && depth === 0 && (
          <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
        )}

        <item.icon
          className={cn(
            "size-4 shrink-0 transition-colors duration-150",
            isActive || anyChildActive
              ? "text-white"
              : "text-zinc-600 group-hover:text-zinc-300",
          )}
        />

        {/* Label area — only visible when expanded */}
        <span
          className={cn(
            "flex flex-1 items-center justify-between overflow-hidden transition-all duration-200",
            isExpanded ? "w-auto opacity-100" : "w-0 opacity-0",
          )}
        >
          <span className="truncate leading-none">{item.label}</span>

          <span className="ml-1 flex shrink-0 items-center gap-1">
            {item.shortcut && !isActive && (
              <span className="font-mono text-[10px] text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100">
                {item.shortcut}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "size-3 text-zinc-600 transition-transform duration-150",
                  open && "rotate-90",
                )}
              />
            )}
          </span>
        </span>
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
            {item.children!.map((child) => (
              <SidebarItem key={child.href} item={child} isExpanded={isExpanded} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

function SidebarSection({
  section,
  isExpanded,
  defaultOpen = true,
  onNavigate,
}: {
  section: NavSection;
  isExpanded: boolean;
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div>
      {/* Section header — only shown when expanded */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline-none",
          isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-zinc-700 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          {section.label}
        </span>
      </button>

      {/* Items */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          !isExpanded || open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mt-0.5 flex flex-col gap-0.5">
          {section.items.map((item) => (
            <SidebarItem key={item.href} item={item} isExpanded={isExpanded} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────── */

interface SidebarProps {
  role?:            "ADMIN" | "CLIENT" | "DEV";
  projects?:        { id: string; name: string }[];
  activeProjectId?: string;
  userName?:        string;
  userAvatar?:      string;
  /** Biases DiceBear when no custom photo is set. */
  userAvatarGender?: UserAvatarGender;
  userId?:          string;
}

export default function Sidebar({
  role            = "CLIENT",
  projects        = [],
  activeProjectId,
  userName        = "User",
  userAvatar,
  userAvatarGender,
  userId,
}: SidebarProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pinned,  setPinned]  = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [avatarGender, setAvatarGender] = React.useState<UserAvatarGender>(
    userAvatarGender ?? "neutral"
  );

  React.useEffect(() => {
    setAvatarGender(userAvatarGender ?? "neutral");
  }, [userAvatarGender]);

  const pathname = usePathname();
  const prevPathnameRef = React.useRef(pathname);

  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setIsNavigating(false);
    }
  }, [pathname]);

  const isExpanded = pinned || hovered;

  const sections: NavSection[] =
    role === "ADMIN" ? [ADMIN_SECTION, CLIENT_SECTION] :
    role === "DEV"   ? [DEV_SECTION] :
    [CLIENT_SECTION];

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function onAvatarGenderChange(next: UserAvatarGender) {
    const prev = avatarGender;
    setAvatarGender(next);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarGender: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      setAvatarGender(prev);
    }
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative z-50 flex h-screen shrink-0 flex-col bg-[#0f0f11]",
        "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isExpanded ? "w-[260px]" : "w-14",
      )}
    >
      {/* ── Logo + pin ─────────────────────────────────────────── */}
      <div className="relative flex h-12 items-center px-2">
        {/* Logo — centered when collapsed, left when expanded */}
        <div className={cn(
          "flex min-w-0 items-center gap-2.5 overflow-hidden transition-all duration-200",
          isExpanded ? "flex-none" : "flex-1 justify-center",
        )}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 108.62 108.78"
            aria-label="Erase Friction"
            className={cn(
              "size-6 shrink-0",
              isNavigating ? "logo-loading" : "drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]",
            )}
          >
            <path fill="#f59e0b" d="M108.62,94.22c0,1.52,0,3.04-.22,4.56-.54,5-4.67,9.99-9.56,9.99h-26.72c-10.75,0-12.93-11.51-8.69-17.92,1.09-1.63,7.49-9.34,12.82-15.53,4.13-5,3.15-12.82-3.8-14.99-5.54-1.74-10.64.65-12.71,6.41-1.19,3.48-2.17,7.06-3.04,10.64-1.63,6.41-3.04,12.82-4.67,19.23-2.93,11.08-7.49,12.06-15.97,12.06H11.19c-2.06,0-4.13-.76-5.87-1.96-3.37-2.28-5.32-6.3-5.32-10.43v-48.01c0-6.41,2.82-11.84,9.02-13.36,3.58-.87,8.69.11,13.47,3.91,12.93,10.32,16.84,13.69,22.81,10.97,7.6-3.48,8.36-15.21-4.34-18.68-13.47-3.69-28.57-7.6-31.39-8.36-2.82-.76-5.32-2.17-7.17-4.56C-1.85,12.87-.22,5.15,5.76,2.11,8.26.81,10.97.16,13.69.05,19.66-.06,35.95.05,38.13.05c1.19,0,2.28.11,3.48.22,3.48.54,6.08,2.28,8.04,5.43,1.85,3.15,2.72,6.63,3.58,10.1,1.41,5.65,2.61,11.41,4.02,17.16.76,3.04,1.52,6.08,2.5,9.02.76,2.17,1.96,4.24,3.8,5.65,4.78,3.58,11.19,1.96,14.12-3.58,1.3-2.17,4.34-16.29,7.93-31.72.87-3.91,2.17-7.39,5.43-9.78,5.87-4.45,12.71-1.41,14.99,2.5.87,1.41,1.52,3.04,1.74,4.67.43,2.82.76,5.54.76,8.36.11,23.14.11,65.28.11,76.14Z"/>
          </svg>
          <span
            className={cn(
              "whitespace-nowrap font-heading font-bold text-[15px] tracking-tight text-white transition-all duration-200",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none w-0",
            )}
          >
            Erase Friction
          </span>
        </div>

        {/* Pin toggle — only rendered when expanded so it never steals space */}
        {isExpanded && (
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors duration-150 hover:bg-white/[0.06] hover:text-zinc-400"
            title={pinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
        )}
      </div>

      {/* ── Project switcher ───────────────────────────────────── */}
      {projects.length > 0 && (
        <div className="px-2 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.05] focus-visible:outline-none",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand/15 ring-1 ring-brand/20">
                <span className="size-2 rounded-sm bg-brand" />
              </span>
              <span
                className={cn(
                  "flex flex-1 items-center justify-between overflow-hidden transition-all duration-200",
                  isExpanded ? "w-auto opacity-100" : "w-0 opacity-0",
                )}
              >
                <span className="truncate font-ui text-[13px] font-medium text-zinc-300">
                  {activeProject?.name ?? "Select project"}
                </span>
                <ChevronDown className="size-3 text-zinc-600 transition-transform duration-150 group-data-[state=open]:rotate-180" />
              </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={4}
              className="w-[220px] border border-white/[0.08] bg-[#1a1a1d] p-1 font-ui shadow-2xl"
            >
              <div className="px-2 pb-1.5 pt-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Projects
                </span>
              </div>
              <DropdownMenuGroup>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-zinc-300 focus:bg-white/[0.06]"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded bg-brand/15 ring-1 ring-brand/20">
                      <span className="size-1.5 rounded-sm bg-brand" />
                    </span>
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Divider */}
      <div className="mx-2 mb-1 h-px bg-white/[0.05]" />

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-1 scrollbar-hide">
        {sections.map((section, i) => (
          <SidebarSection
            key={section.id}
            section={section}
            isExpanded={isExpanded}
            defaultOpen={i === 0}
            onNavigate={() => setIsNavigating(true)}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-2 mt-1 h-px bg-white/[0.05]" />

      {/* ── Bottom: timer + user ────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 px-2 py-2">
        {/* Timer — admin and dev */}
        {(role === "ADMIN" || role === "DEV") && userId && (
          <CompactTimer
            userId={userId}
            projects={projects}
            isExpanded={isExpanded}
          />
        )}

        {/* Notifications */}
        {userId && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
              "transition-colors duration-150 hover:bg-white/[0.04]",
            )}
          >
            <NotificationDropdown userId={userId} dark />
            <span
              className={cn(
                "whitespace-nowrap font-ui text-[13px] font-medium text-zinc-500 transition-all duration-200",
                isExpanded ? "opacity-100" : "pointer-events-none w-0 opacity-0",
              )}
            >
              Notifications
            </span>
          </div>
        )}

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.05] focus-visible:outline-none"
          >
            <Avatar className="size-7 shrink-0 ring-1 ring-white/10">
              <AvatarImage
                key={`${userId ?? ""}-${avatarGender}`}
                src={resolveUserAvatarUrl(userAvatar, userId ?? userName, { gender: avatarGender })}
                alt={userName}
              />
              <AvatarFallback className="bg-zinc-800 text-[11px] font-ui font-semibold text-zinc-300">
                {initials}
              </AvatarFallback>
            </Avatar>

            <span
              className={cn(
                "flex flex-1 flex-col overflow-hidden text-left transition-all duration-200",
                isExpanded ? "w-auto opacity-100" : "w-0 opacity-0",
              )}
            >
              <span className="truncate font-ui text-[13px] font-medium leading-tight text-zinc-200">
                {userName}
              </span>
              <span className="font-ui text-[10px] uppercase tracking-wide text-zinc-600">
                {role === "ADMIN" ? "Admin" : role === "DEV" ? "Developer" : "Client"}
              </span>
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={6}
            className="mb-1 w-[200px] border border-white/[0.08] bg-[#1a1a1d] p-1 font-ui shadow-2xl"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-[13px] font-medium text-zinc-200">{userName}</p>
              <p className="text-[11px] text-zinc-600">
                {role === "ADMIN" ? "Administrator" : role === "DEV" ? "Developer" : "Client"}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              DiceBear look (no photo)
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={avatarGender}
              onValueChange={(v) => void onAvatarGenderChange(v as UserAvatarGender)}
            >
              <DropdownMenuRadioItem
                value="neutral"
                className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-zinc-300 focus:bg-white/[0.06]"
              >
                Balanced
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="female"
                className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-zinc-300 focus:bg-white/[0.06]"
              >
                Feminine
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="male"
                className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-zinc-300 focus:bg-white/[0.06]"
              >
                Masculine
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-zinc-400 focus:bg-white/[0.06]">
              <Settings className="size-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={() => { window.location.href = "/api/auth/signout"; }}
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
