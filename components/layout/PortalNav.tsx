"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":          "Dashboard",
  "/projects":           "Projects",
  "/docs":               "Docs",
  "/messages":           "Messages",
  "/invoices":           "Invoices",
  "/assets":             "Assets",
  "/notifications":      "Notifications",
  "/admin/projects":     "All Projects",
  "/admin/clients":      "Clients",
  "/admin/analytics":    "Analytics",
  "/admin/time":         "Time",
  "/admin/dev":          "Dev Tools",
};

function usePageLabel(): string {
  const pathname = usePathname();
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname === route || pathname.startsWith(route + "/")) return label;
  }
  return "Erase Friction";
}

export default function PortalNav() {
  const pageLabel = usePageLabel();

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-black/[0.06] bg-page/80 px-5 backdrop-blur-md">
      {/* Page title */}
      <span className="font-heading text-[15px] font-semibold tracking-tight text-ink/80">
        {pageLabel}
      </span>

      {/* Search pill */}
      <button
        type="button"
        className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-muted-foreground transition-all duration-150 hover:border-ink/20 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Search"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden sm:block">Search…</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-px rounded border border-border bg-subtle px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
