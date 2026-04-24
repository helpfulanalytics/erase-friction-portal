import "server-only";

import { SignJWT } from "jose";
import { adminDb } from "@/lib/firebase-admin";

type GithubIntegrationDoc = {
  installationId: number;
  repoAllowlist: string[];
  updatedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  connectedByUid: string;
};

function githubAppId(): string {
  const id = process.env.GITHUB_APP_ID;
  if (!id) throw new Error("GITHUB_APP_ID env var is not set");
  return id;
}

function githubPrivateKeyPem(): string {
  const key = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!key) throw new Error("GITHUB_APP_PRIVATE_KEY env var is not set");
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export async function getGithubIntegration(): Promise<GithubIntegrationDoc | null> {
  const snap = await adminDb.collection("integrations").doc("github").get();
  return snap.exists ? (snap.data() as GithubIntegrationDoc) : null;
}

export async function upsertGithubIntegration(input: {
  installationId: number;
  repoAllowlist: string[];
  connectedByUid: string;
}): Promise<void> {
  const now = (await import("firebase-admin/firestore")).Timestamp.now();
  const doc: Partial<GithubIntegrationDoc> = {
    installationId: input.installationId,
    repoAllowlist: input.repoAllowlist,
    updatedAt: now,
    connectedByUid: input.connectedByUid,
  };

  await adminDb
    .collection("integrations")
    .doc("github")
    .set(
      {
        ...doc,
        createdAt: now,
      },
      { merge: true }
    );
}

async function githubAppJwt(): Promise<string> {
  const appId = githubAppId();
  const privateKey = githubPrivateKeyPem();
  const key = await import("node:crypto").then((c) => c.createPrivateKey(privateKey));

  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 5)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key);
}

export async function getGithubInstallationToken(installationId: number): Promise<string> {
  const jwt = await githubAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: "application/vnd.github+json",
      "user-agent": "erase-friction-portal",
    },
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !data.token) {
    throw new Error(data?.message || "Failed to fetch GitHub installation token");
  }
  return data.token;
}

export async function githubApi<T>(args: {
  token: string;
  path: string;
  searchParams?: Record<string, string | number | undefined | null>;
}): Promise<T> {
  const url = new URL(`https://api.github.com${args.path}`);
  for (const [k, v] of Object.entries(args.searchParams ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      authorization: `token ${args.token}`,
      accept: "application/vnd.github+json",
      "user-agent": "erase-friction-portal",
    },
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "GitHub API request failed");
  }
  return data as T;
}

