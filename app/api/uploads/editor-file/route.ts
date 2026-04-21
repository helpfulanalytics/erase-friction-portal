export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { uploadToDrive } from "@/lib/google-drive";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin } from "@/lib/server/project-access";

function safeExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] ?? "bin";
  return ext.length > 12 ? "bin" : ext;
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const form = await request.formData();
  const docId = String(form.get("docId") ?? "").trim();
  const file = form.get("file");

  if (!docId) return NextResponse.json({ error: "docId is required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name);
  const filename = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}.${ext}`;

  const { fileId, url } = await uploadToDrive({
    name: filename,
    mimeType: file.type || "application/octet-stream",
    body: bytes,
    folderPath: `documents/${docId}/uploads`,
  });

  return NextResponse.json({ url, driveFileId: fileId, name: file.name, type: file.type, size: file.size });
}

