/**
 * Resolves avatar URLs: real photo when set, otherwise deterministic DiceBear
 * per user (stable seed → stable face + illustration style).
 */

const DICEBEAR_VERSION = "9.x" as const;

/** Styles that read well at small sizes; one is picked deterministically per seed. */
const DICEBEAR_STYLES = ["micah", "notionists", "lorelei", "avataaars"] as const;

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dicebearStyleForSeed(seed: string): (typeof DICEBEAR_STYLES)[number] {
  const idx = fnv1a32(seed) % DICEBEAR_STYLES.length;
  return DICEBEAR_STYLES[idx];
}

/** Public DiceBear URL for a seed (use when you only have an id/email, no stored avatar). */
export function dicebearAvatarUrl(seed: string): string {
  const normalized = seed.trim() || "user";
  const style = dicebearStyleForSeed(normalized);
  const params = new URLSearchParams({ seed: normalized });
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/svg?${params.toString()}`;
}

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/**
 * Prefer `avatar` when it looks like a real URL; otherwise DiceBear from `seed`
 * (typically Firebase uid, stable id, or email).
 */
export function resolveUserAvatarUrl(
  avatar: string | null | undefined,
  seed: string
): string {
  const trimmed = avatar?.trim();
  if (trimmed && looksLikeHttpUrl(trimmed)) return trimmed;
  const stableSeed = seed.trim() || trimmed || "user";
  return dicebearAvatarUrl(stableSeed);
}

/** Shown until `/api/users/lookup` fills the discussion plugin `users` map. */
export function fallbackDiscussionProfile(userId: string): {
  name: string;
  avatarUrl: string;
} {
  const id = userId.trim() || "user";
  return { name: "User", avatarUrl: resolveUserAvatarUrl(undefined, id) };
}
