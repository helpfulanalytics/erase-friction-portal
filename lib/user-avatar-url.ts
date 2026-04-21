/**
 * Resolves avatar URLs: real photo when set, otherwise DiceBear **fun** character
 * styles (rotated by seed): Open Peeps, Big Smile, Croodles, Fun Emoji — with
 * soft gradients and gender biasing where the style supports it.
 */

import type { UserAvatarGender } from "@/types/models";

const DICEBEAR_VERSION = "9.x" as const;

/** Playful styles; same seed always maps to the same style (stable avatars). */
const FUN_STYLES = ["open-peeps", "big-smile", "croodles", "fun-emoji"] as const;
type FunStyle = (typeof FUN_STYLES)[number];

/** Soft pastel backgrounds that read well behind faces. */
const BG_COLORS =
  "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,e8d5f2,f5e6c8,d4edda";

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function funStyleForSeed(seed: string): FunStyle {
  return FUN_STYLES[fnv1a32(seed) % FUN_STYLES.length];
}

// --- Avataaars-style hair lists reused conceptually for Open Peeps `head` ---

/** Open Peeps: lean masculine (no bun / long-bangs cluster that skews feminine). */
const OPEN_PEEPS_HEAD_MALE =
  "afro,cornrows,cornrows2,dreads1,dreads2,flatTop,flatTopLong,grayMedium,grayShort,hatBeanie,hatHip,hijab,mohawk,mohawk2,noHair1,noHair2,noHair3,pomp,shaved1,shaved2,shaved3,short1,short2,short3,short4,short5,turban,twists,twists2,medium1,medium2,medium3,mediumStraight,bear";

const OPEN_PEEPS_HEAD_FEMALE =
  "afro,bangs,bangs2,bantuKnots,bun,bun2,buns,cornrows,cornrows2,dreads1,dreads2,flatTop,flatTopLong,grayBun,grayMedium,grayShort,hatBeanie,hatHip,hijab,long,longAfro,longBangs,longCurly,medium1,medium2,medium3,mediumBangs,mediumBangs2,mediumBangs3,mediumStraight,mohawk,mohawk2,noHair1,noHair2,noHair3,pomp,shaved1,shaved2,shaved3,short1,short2,short3,short4,short5,turban,twists,twists2,bear";

const OPEN_PEEPS_SKIN = "694d3d,ae5d29,d08b5b,edb98a,ffdbb4";

/** Big Smile: hair allowlists — big grins + optional silly accessories from seed. */
const BIG_SMILE_HAIR_MALE =
  "bowlCutHair,curlyShortHair,halfShavedHead,mohawk,shavedHead,shortHair,straightHair";

const BIG_SMILE_HAIR_FEMALE =
  "bangs,braids,bunHair,curlyBob,curlyShortHair,froBun,straightHair,wavyBob";

const BIG_SMILE_SKIN = "8c5a2b,643d19,a47539,c99c62,e2ba87,efcc9f,f5d7b1,ffe4c0";

function applyGenderParams(
  style: FunStyle,
  gender: UserAvatarGender | undefined,
  params: URLSearchParams
): void {
  const g: UserAvatarGender = gender ?? "neutral";

  if (style === "open-peeps") {
    params.set("skinColor", OPEN_PEEPS_SKIN);
    if (g === "male") {
      params.set("facialHairProbability", "78");
      params.set("head", OPEN_PEEPS_HEAD_MALE);
    } else if (g === "female") {
      params.set("facialHairProbability", "10");
      params.set("head", OPEN_PEEPS_HEAD_FEMALE);
    } else {
      params.set("facialHairProbability", "42");
    }
    return;
  }

  if (style === "big-smile") {
    params.set("skinColor", BIG_SMILE_SKIN);
    if (g === "male") {
      params.set("hair", BIG_SMILE_HAIR_MALE);
    } else if (g === "female") {
      params.set("hair", BIG_SMILE_HAIR_FEMALE);
    }
    return;
  }

  if (style === "croodles") {
    if (g === "male") {
      params.set("beardProbability", "72");
      params.set("mustacheProbability", "45");
    } else if (g === "female") {
      params.set("beardProbability", "6");
      params.set("mustacheProbability", "4");
    } else {
      params.set("beardProbability", "38");
      params.set("mustacheProbability", "22");
    }
    return;
  }

  // fun-emoji: playful expression bias; no human gender metadata in the set.
  params.set(
    "mouth",
    "cute,smileLol,wideSmile,tongueOut,kissHeart,drip,shy,lilSmile,smileTeeth"
  );
  params.set("eyes", "love,stars,wink,wink2,cute,glasses,shades,plain,sleepClose");
}

export type ResolveAvatarOptions = {
  gender?: UserAvatarGender;
};

/** Public DiceBear URL for a seed (when no custom photo is stored). */
export function dicebearAvatarUrl(seed: string, gender?: UserAvatarGender): string {
  const normalized = seed.trim() || "user";
  const style = funStyleForSeed(normalized);
  const params = new URLSearchParams();
  params.set("seed", normalized);
  params.set("backgroundType", "gradientLinear,solid");
  params.set("backgroundColor", BG_COLORS);
  applyGenderParams(style, gender, params);
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/svg?${params.toString()}`;
}

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/**
 * Prefer `avatar` when it looks like a real URL; otherwise DiceBear from `seed`.
 * Pass `options.gender` to bias generated avatars (ignored for real photo URLs).
 */
export function resolveUserAvatarUrl(
  avatar: string | null | undefined,
  seed: string,
  options?: ResolveAvatarOptions
): string {
  const trimmed = avatar?.trim();
  if (trimmed && looksLikeHttpUrl(trimmed)) return trimmed;
  const stableSeed = seed.trim() || trimmed || "user";
  return dicebearAvatarUrl(stableSeed, options?.gender);
}

/** Shown until `/api/users/lookup` fills the discussion plugin `users` map. */
export function fallbackDiscussionProfile(userId: string): {
  name: string;
  avatarUrl: string;
} {
  const id = userId.trim() || "user";
  return { name: "User", avatarUrl: resolveUserAvatarUrl(undefined, id) };
}
