"use client";

import * as React from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function FirebaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    fetch("/api/auth/firebase-token", { credentials: "include" })
      .then((r) => r.json())
      .then(({ token }) => {
        if (token) return signInWithCustomToken(auth, token);
      })
      .catch(() => {});
  }, []);

  return <>{children}</>;
}
