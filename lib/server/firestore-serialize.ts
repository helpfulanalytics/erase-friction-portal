import "server-only";

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function isTimestampLike(v: unknown): v is { toMillis: () => number } {
  return (
    typeof v === "object" &&
    v !== null &&
    "toMillis" in v &&
    typeof (v as { toMillis: unknown }).toMillis === "function"
  );
}

export function toJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (isTimestampLike(value)) return value.toMillis();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJsonValue(v);
    }
    return out;
  }
  return null;
}

