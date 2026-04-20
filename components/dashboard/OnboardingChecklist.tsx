"use client";

import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
};

function ProgressRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="rgb(244 244 245)"
        strokeWidth="8"
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#B9FF66"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        className="fill-[#09090b]"
        style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700 }}
      >
        {p}%
      </text>
    </svg>
  );
}

export function OnboardingChecklist({
  percent,
  completedCount,
  totalCount,
  items,
  className,
}: {
  percent: number;
  completedCount: number;
  totalCount: number;
  items: Item[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-6 shadow-card", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <ProgressRing percent={percent} />
          <div>
            <div className="font-headingAlt text-lg font-bold tracking-tight text-ink">
              Onboarding checklist
            </div>
            <div className="mt-1 font-ui text-sm text-muted-foreground">
              {completedCount} of {totalCount} steps complete
            </div>
          </div>
        </div>
        <div className="font-ui text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Progress
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                item.completed
                  ? "border-brand bg-brand"
                  : "border-border bg-surface"
              )}
              aria-hidden="true"
            >
              {item.completed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#09090b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="font-headingAlt text-sm font-semibold text-ink">
                {item.title}
              </div>
              {item.description ? (
                <div className="mt-0.5 font-ui text-sm text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

