export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/server/session-from-cookie";
import { assertAssetsAdmin, getAssetOr404 } from "@/lib/server/assets-access";
import { deleteFromDrive } from "@/lib/google-drive";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertAssetsAdmin(session);

  const { id } = await params;
  const asset = await getAssetOr404(id);
  const driveFileId = String(asset.data.driveFileId ?? "");

  if (driveFileId) {
    try {
      await deleteFromDrive(driveFileId);
    } catch {
      // If Drive delete fails, still allow Firestore cleanup.
    }
  }

  await asset.ref.delete();
  return NextResponse.json({ success: true });
}

