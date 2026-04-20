export type Asset = {
  id: string;
  projectId: string;
  uploadedBy: string;
  name: string;
  url: string;
  path?: string | null;
  size: number;
  mimeType: string;
  createdAt?: number;
};

export type AssetKind = "IMAGE" | "DOCUMENT" | "ARCHIVE" | "OTHER";

export function kindForAsset(a: Pick<Asset, "name" | "mimeType">): AssetKind {
  const name = a.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  if (a.mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return "IMAGE";
  if (["pdf", "docx", "xlsx", "pptx"].includes(ext)) return "DOCUMENT";
  if (ext === "zip") return "ARCHIVE";
  return "OTHER";
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

