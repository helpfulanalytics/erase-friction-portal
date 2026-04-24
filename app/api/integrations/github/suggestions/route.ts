export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdminOrDev } from "@/lib/server/project-access";
import { getGithubIntegration, getGithubInstallationToken, githubApi } from "@/lib/server/github-app";

type CommitSuggestion = {
  repoFullName: string;
  sha: string;
  url: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
};

type PrSuggestion = {
  repoFullName: string;
  number: number;
  url: string;
  title: string;
  state: string;
  updatedAt: string;
};

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdminOrDev(session);

  const url = new URL(request.url);
  const repoFullName = String(url.searchParams.get("repoFullName") ?? "").trim();
  const sinceIso = String(url.searchParams.get("since") ?? "").trim() || null;
  const includePrs = url.searchParams.get("includePrs") !== "0";

  if (!repoFullName || !/^[^/]+\/[^/]+$/.test(repoFullName)) {
    return NextResponse.json({ error: "repoFullName must be like owner/repo" }, { status: 400 });
  }

  const integration = await getGithubIntegration();
  if (!integration?.installationId) {
    return NextResponse.json({ error: "GitHub integration not connected" }, { status: 400 });
  }

  if (integration.repoAllowlist?.length && !integration.repoAllowlist.includes(repoFullName)) {
    return NextResponse.json({ error: "Repo not allowed" }, { status: 403 });
  }

  const token = await getGithubInstallationToken(integration.installationId);
  const [owner, repo] = repoFullName.split("/");

  const commits = await githubApi<
    Array<{
      sha: string;
      html_url: string;
      commit: { message: string; author: { name: string; email: string; date: string } };
    }>
  >({
    token,
    path: `/repos/${owner}/${repo}/commits`,
    searchParams: { per_page: 30, since: sinceIso ?? undefined },
  });

  const myEmail = (session.email ?? "").trim().toLowerCase();
  const commitSuggestions: CommitSuggestion[] = commits
    .map((c) => ({
      repoFullName,
      sha: c.sha,
      url: c.html_url,
      message: c.commit.message.split("\n")[0] ?? "",
      authorName: c.commit.author.name,
      authorEmail: c.commit.author.email,
      date: c.commit.author.date,
    }))
    .filter((c) => (myEmail ? c.authorEmail.toLowerCase() === myEmail : true))
    .slice(0, 20);

  let prSuggestions: PrSuggestion[] = [];
  if (includePrs) {
    const prs = await githubApi<
      Array<{
        number: number;
        html_url: string;
        title: string;
        state: string;
        updated_at: string;
      }>
    >({
      token,
      path: `/repos/${owner}/${repo}/pulls`,
      searchParams: { per_page: 20, sort: "updated", direction: "desc", state: "all" },
    });
    prSuggestions = prs.map((p) => ({
      repoFullName,
      number: p.number,
      url: p.html_url,
      title: p.title,
      state: p.state,
      updatedAt: p.updated_at,
    }));
  }

  return NextResponse.json({ commits: commitSuggestions, prs: prSuggestions });
}

