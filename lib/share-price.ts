/**
 * Parses a user-entered price string into a number, or null.
 * - Trims; empty -> null.
 * - Accepts a comma decimal separator (normalised to a dot).
 * - Non-numeric or negative -> null.
 * - Rounds to 2 decimals.
 */
export function parsePrice(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
