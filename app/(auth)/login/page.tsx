import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign in — Erase Friction",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-8"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <span className="shrink-0 inline-flex items-center justify-center h-10 w-10 border-2 border-ink rounded-xl bg-brand shadow-[4px_4px_0_0_#000]">
            <Image src="/logo-black.svg" alt="Erase Friction" width={28} height={28} />
          </span>
          <span className="font-heading font-bold text-2xl tracking-tighter text-ink leading-none">
            Erase Friction
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-ink font-headingAlt">Welcome back</h1>
        <p className="mb-6 font-ui text-sm text-muted-foreground">
          Sign in to your client portal.
        </p>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs font-medium text-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs font-medium text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <button
            type="submit"
            className="mt-1 h-11 w-full cursor-pointer rounded-lg bg-brand font-ui text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90"
          >
            Sign in
          </button>

          <button
            type="button"
            className="h-11 w-full cursor-pointer rounded-lg border border-border bg-transparent font-ui text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
