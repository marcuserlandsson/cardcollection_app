export interface ParsedCard {
  cardNumber: string;
  quantity: number;
}

export interface ParseError {
  line: string;
  reason: string;
}

export interface ParseResult {
  parsed: ParsedCard[];
  errors: ParseError[];
}

/**
 * Parses a text block of card entries. Supports formats:
 * - "BT1-001 3" or "BT1-001 x3" or "BT1-001,3"
 * - "4 (BT14-001)" — quantity first, card number in parentheses (digimoncard.io format)
 * - Card number only (defaults to quantity 1)
 * One card per line. Blank lines and lines starting with # are ignored.
 */
export function parseCardList(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const parsed: ParsedCard[] = [];
  const errors: ParseError[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    // Format: "4 (BT14-001)" or "4x (BT14-001)" — quantity first, card number in parens
    const parenMatch = line.match(/^(\d+)\s*x?\s*\(([A-Za-z0-9]+-\d+)\)$/);
    // Format: "BT1-001 3" or "BT1-001 x3" or "BT1-001,3" or just "BT1-001"
    const standardMatch = line.match(/^([A-Za-z0-9]+-\d+)\s*[,xX×]?\s*(\d+)?$/);

    const match = parenMatch || standardMatch;
    if (!match) {
      errors.push({ line, reason: "Unrecognized format" });
      continue;
    }

    const cardNumber = parenMatch
      ? match[2].toUpperCase()
      : match[1].toUpperCase();
    const rawQty = parenMatch ? match[1] : match[2];
    const quantity = rawQty ? parseInt(rawQty, 10) : 1;

    if (quantity <= 0) {
      errors.push({ line, reason: "Quantity must be at least 1" });
      continue;
    }

    parsed.push({ cardNumber, quantity });
  }

  // Merge duplicates
  const merged = new Map<string, number>();
  for (const entry of parsed) {
    merged.set(entry.cardNumber, (merged.get(entry.cardNumber) ?? 0) + entry.quantity);
  }

  return {
    parsed: Array.from(merged, ([cardNumber, quantity]) => ({ cardNumber, quantity })),
    errors,
  };
}

/**
 * Parses CSV text. Auto-detects column names for card number and quantity.
 * Falls back to first column = card number, second column = quantity.
 */
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { parsed: [], errors: [] };

  const headerLine = lines[0];
  const separator = headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const numberAliases = ["card_number", "cardnumber", "card number", "number", "id", "card_id", "card"];
  const qtyAliases = ["quantity", "qty", "count", "amount"];

  let numberCol = headers.findIndex((h) => numberAliases.includes(h));
  let qtyCol = headers.findIndex((h) => qtyAliases.includes(h));

  const hasHeader = numberCol !== -1;
  if (!hasHeader) {
    numberCol = 0;
    qtyCol = headers.length > 1 ? 1 : -1;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const textLines: string[] = [];

  for (const line of dataLines) {
    const cols = line.split(separator).map((c) => c.trim().replace(/['"]/g, ""));
    const cardNumber = cols[numberCol] ?? "";
    const quantity = qtyCol >= 0 ? cols[qtyCol] ?? "1" : "1";
    if (cardNumber) {
      textLines.push(`${cardNumber} ${quantity}`);
    }
  }

  return parseCardList(textLines.join("\n"));
}
