import "server-only";

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

