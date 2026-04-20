/** Normalize for comparing typed name to profile name (case, spacing, Unicode). */
export function normalizeSignerName(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}
