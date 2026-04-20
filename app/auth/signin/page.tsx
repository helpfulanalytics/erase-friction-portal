import { Suspense } from "react";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page">
          <p className="font-ui text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}

