export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { uploadToDrive } from "@/lib/google-drive";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";
import { assertCanAccessProjectAssets } from "@/lib/server/assets-access";
import { toJsonValue } from "@/lib/server/firestore-serialize";

const MAX_BYTES = 50 * 1024 * 1024;

const EXT_ALLOW = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "zip",
]);

function safeExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

function safeBaseName(name: string) {
  const cleaned = name.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 120) || "file";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  await assertCanAccessProjectAssets(session, projectId);

  const snap = await adminDb
    .collection("assets")
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  const assets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ assets: toJsonValue(assets) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const { id: projectId } = await params;
  await assertCanAccessProjectAssets(session, projectId);

  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 413 });

  const ext = safeExt(file.name || name);
  if (!ext || !EXT_ALLOW.has(ext)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const originalName = safeBaseName(name || file.name || `asset.${ext}`);
  const filename = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}-${originalName}`;

  const bytes = Buffer.from(await file.arrayBuffer());

  const { fileId: driveFileId, url } = await uploadToDrive({
    name: filename,
    mimeType: file.type || "application/octet-stream",
    body: bytes,
    folderPath: `projects/${projectId}/assets`,
  });

  const assetRef = adminDb.collection("assets").doc();
  const now = Timestamp.now();
  await assetRef.set({
    projectId,
    uploadedBy: session.uid,
    name: originalName,
    url,
    driveFileId,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    createdAt: now,
  });

  return NextResponse.json({ success: true, asset: toJsonValue({ id: assetRef.id, projectId, uploadedBy: session.uid, name: originalName, url, driveFileId, size: file.size, mimeType: file.type || "application/octet-stream", createdAt: now }) });
}

