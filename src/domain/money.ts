/** Parse a user-entered dollar string to integer cents. Returns null if invalid or negative. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "");
  if (cleaned === "") return null;
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Format integer cents as a dollar string, e.g. 1234 -> "$12.34", -150 -> "-$1.50". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${remainder}`;
}

/** Sum an array of integer cents. */
export function sumCents(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
