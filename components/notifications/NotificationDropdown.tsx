"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, FileCheck2, FileClock, FileText, Receipt, MessageSquare } from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover-base";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt?: number;
};

function iconForType(type: string) {
  switch (type) {
    case "DOC_APPROVAL_REQUESTED":
      return <FileClock className="size-4 text-muted-foreground" />;
    case "DOC_APPROVED":
      return <FileCheck2 className="size-4 text-muted-foreground" />;
    case "DOC_SHARED":
      return <FileText className="size-4 text-muted-foreground" />;
    case "INVOICE_SENT":
      return <Receipt className="size-4 text-muted-foreground" />;
    case "MESSAGE_RECEIVED":
      return <MessageSquare className="size-4 text-muted-foreground" />;
    default:
      return <Bell className="size-4 text-muted-foreground" />;
  }
}

async function markAllRead() {
  await fetch("/api/notifications/read", { method: "PATCH", credentials: "include" });
}

async function markOneRead(id: string) {
  await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
}

export function NotificationDropdown({ userId, dark = false }: { userId: string; dark?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notif[]>([]);

  React.useEffect(() => {
    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        unsubSnap = onSnapshot(q, (snap) => {
          const next: Notif[] = snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            const createdAt = (data.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
            return {
              id: d.id,
              title: String(data.title ?? ""),
              body: String(data.body ?? ""),
              type: String(data.type ?? ""),
              link: (data.link as string | null | undefined) ?? null,
              read: Boolean(data.read),
              createdAt: createdAt ?? undefined,
            };
          });
          setItems(next);
        });
      } else {
        if (unsubSnap) {
          unsubSnap();
          unsubSnap = undefined;
        }
        setItems([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [userId]);

  const unread = items.filter((n) => !n.read).length;
  const latest = items.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "cursor-pointer size-8 rounded-md transition-colors duration-150",
                dark
                  ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  : "text-ink hover:bg-subtle"
              )}
              aria-label="Notifications"
            />
          }
        >
          <Bell className="size-4" />
        </PopoverTrigger>

        {unread > 0 ? (
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 p-0 font-ui text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </Badge>
        ) : null}
      </div>

      <PopoverContent className="w-[320px] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Notifications
          </div>
          <button
            type="button"
            onClick={async () => {
              await markAllRead();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-ui text-xs font-semibold text-ink hover:bg-subtle"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
        </div>

        <div className="max-h-[420px] overflow-auto p-2">
          {latest.length === 0 ? (
            <div className="rounded-lg border border-border bg-subtle p-3 font-ui text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-1">
              {latest.map((n) => {
                const when = n.createdAt
                  ? formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })
                  : "";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={async () => {
                      if (!n.read) await markOneRead(n.id);
                      setOpen(false);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      "w-full rounded-lg border border-transparent px-2 py-2 text-left hover:bg-subtle",
                      !n.read && "bg-brand/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{iconForType(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-ui text-sm font-semibold text-ink">
                          {n.title}
                        </div>
                        <div className="mt-0.5 line-clamp-2 font-headingAlt text-sm text-muted-foreground">
                          {n.body}
                        </div>
                        <div className="mt-1 font-ui text-[11px] text-muted-foreground">
                          {when}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-3 py-2">
          <Link
            href="/dashboard/notifications"
            className="font-ui text-sm font-semibold text-ink hover:underline"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

