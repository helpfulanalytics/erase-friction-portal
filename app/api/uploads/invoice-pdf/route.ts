export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAdmin, assertProjectMember } from "@/lib/server/project-access";
import { uploadToDrive } from "@/lib/google-drive";

const MAX_BYTES = 50 * 1024 * 1024;

function safeInvoiceNumber(input: string) {
  const s = input.trim();
  return s.replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
}

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAdmin(session);

  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "").trim();
  const invoiceNumberRaw = String(form.get("invoiceNumber") ?? "").trim();
  const file = form.get("file");

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  await assertProjectMember(session, projectId);

  if (!invoiceNumberRaw) return NextResponse.json({ error: "invoiceNumber is required" }, { status: 400 });
  const invoiceNumber = safeInvoiceNumber(invoiceNumberRaw);
  if (!invoiceNumber) return NextResponse.json({ error: "invoiceNumber is invalid" }, { status: 400 });

  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 413 });

  const name = (file.name || "").toLowerCase();
  if (!name.endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const { fileId, url } = await uploadToDrive({
    name: `${invoiceNumber}.pdf`,
    mimeType: "application/pdf",
    body: bytes,
    folderPath: `projects/${projectId}/invoices`,
  });

  return NextResponse.json({ url, driveFileId: fileId });
}

