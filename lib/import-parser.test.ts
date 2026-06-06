import { describe, it, expect } from "vitest";
import { parseCardList, parseCSV } from "@/lib/import-parser";

describe("parseCardList", () => {
  it("parses 'CARD qty' format", () => {
    expect(parseCardList("BT1-001 3").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 3 }]);
  });
  it("parses 'CARD xqty' and comma formats", () => {
    expect(parseCardList("BT1-001 x2").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 2 }]);
    expect(parseCardList("BT1-002,5").parsed).toEqual([{ cardNumber: "BT1-002", quantity: 5 }]);
  });
  it("parses 'qty (CARD)' digimoncard.io format", () => {
    expect(parseCardList("4 (BT14-001)").parsed).toEqual([{ cardNumber: "BT14-001", quantity: 4 }]);
  });
  it("defaults quantity to 1 when omitted", () => {
    expect(parseCardList("BT3-015").parsed).toEqual([{ cardNumber: "BT3-015", quantity: 1 }]);
  });
  it("ignores blank lines and comments", () => {
    expect(parseCardList("\n# a comment\nBT1-001 1\n").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 1 }]);
  });
  it("merges duplicate card numbers", () => {
    expect(parseCardList("BT1-001 2\nBT1-001 3").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 5 }]);
  });
  it("uppercases card numbers", () => {
    expect(parseCardList("bt1-001 1").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 1 }]);
  });
  it("reports unrecognized lines as errors", () => {
    const result = parseCardList("not a card");
    expect(result.errors).toHaveLength(1);
    expect(result.parsed).toHaveLength(0);
  });
});

describe("parseCSV", () => {
  it("parses a CSV with headers", () => {
    const csv = "card_number,quantity\nBT1-001,3\nBT1-002,1";
    expect(parseCSV(csv).parsed).toEqual([
      { cardNumber: "BT1-001", quantity: 3 },
      { cardNumber: "BT1-002", quantity: 1 },
    ]);
  });
  it("falls back to first/second column without headers", () => {
    const csv = "BT1-001,2\nBT1-002,4";
    expect(parseCSV(csv).parsed).toEqual([
      { cardNumber: "BT1-001", quantity: 2 },
      { cardNumber: "BT1-002", quantity: 4 },
    ]);
  });
});
