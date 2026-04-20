import "server-only";
import { google } from "googleapis";
import { Readable } from "node:stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

const drive = google.drive({ version: "v3", auth: getAuth() });

/**
 * Upload a file to the shared Google Drive folder.
 * Returns { fileId, url } where url is a publicly viewable link.
 */
export async function uploadToDrive(opts: {
  name: string;
  mimeType: string;
  body: Buffer;
  /** Optional subfolder path like "projects/abc/assets". Created inside the root folder. */
  folderPath?: string;
}): Promise<{ fileId: string; url: string }> {
  let parentId = FOLDER_ID;

  // Create nested subfolders if requested
  if (opts.folderPath) {
    const parts = opts.folderPath.split("/").filter(Boolean);
    for (const part of parts) {
      parentId = await getOrCreateFolder(part, parentId);
    }
  }

  const res = await drive.files.create({
    requestBody: {
      name: opts.name,
      parents: [parentId],
    },
    media: {
      mimeType: opts.mimeType,
      body: Readable.from(opts.body),
    },
    fields: "id",
  });

  const fileId = res.data.id!;

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const url = `https://drive.google.com/uc?id=${fileId}&export=download`;
  return { fileId, url };
}

/**
 * Delete a file from Google Drive by its file ID.
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId });
  } catch (err: unknown) {
    // Ignore 404 — file already gone
    if (err instanceof Error && "code" in err && (err as { code: number }).code === 404) return;
    throw err;
  }
}

/** Find or create a subfolder inside a parent folder. */
async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q: query, fields: "files(id)", pageSize: 1 });

  if (list.data.files?.length) return list.data.files[0]!.id!;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return created.data.id!;
}
