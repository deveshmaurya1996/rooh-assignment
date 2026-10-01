export function normalizeDate(raw: string | null): string | null {
  if (raw == null || raw.trim() === '') return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : raw;
}
