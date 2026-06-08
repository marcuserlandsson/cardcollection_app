import { describe, it, expect } from "vitest";
import { parsePrice } from "@/lib/share-price";

describe("parsePrice", () => {
  it("parses a decimal string", () => {
    expect(parsePrice("19.99")).toBe(19.99);
  });
  it("accepts a comma decimal separator", () => {
    expect(parsePrice("1,50")).toBe(1.5);
  });
  it("parses an integer string", () => {
    expect(parsePrice("5")).toBe(5);
  });
  it("returns null for empty or whitespace input", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("   ")).toBeNull();
  });
  it("returns null for non-numeric input", () => {
    expect(parsePrice("abc")).toBeNull();
  });
  it("returns null for negative numbers", () => {
    expect(parsePrice("-3")).toBeNull();
  });
  it("rounds to two decimals", () => {
    expect(parsePrice("2.999")).toBe(3);
    expect(parsePrice("10.126")).toBe(10.13);
  });
});
