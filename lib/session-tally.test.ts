import { describe, it, expect } from "vitest";
import { recordAdjustment, sessionTotal, type SessionState } from "@/lib/session-tally";

const item = (cardNumber: string) => ({ cardNumber, name: cardNumber, variantName: "Regular" });

describe("recordAdjustment", () => {
  it("adds a new item to the front", () => {
    const s = recordAdjustment([], item("BT9-001"), 1);
    expect(s).toEqual([{ cardNumber: "BT9-001", name: "BT9-001", variantName: "Regular", qtyAdded: 1 }]);
  });
  it("accumulates quantity for an existing item and moves it to the front", () => {
    let s: SessionState = recordAdjustment([], item("BT9-001"), 1);
    s = recordAdjustment(s, item("BT9-002"), 1);
    s = recordAdjustment(s, item("BT9-001"), 2);
    expect(s.map((x) => x.cardNumber)).toEqual(["BT9-001", "BT9-002"]);
    expect(s[0].qtyAdded).toBe(3);
  });
  it("removes an item when its net quantity drops to zero", () => {
    let s = recordAdjustment([], item("BT9-001"), 2);
    s = recordAdjustment(s, item("BT9-001"), -2);
    expect(s).toEqual([]);
  });
});

describe("sessionTotal", () => {
  it("sums quantities across items", () => {
    let s = recordAdjustment([], item("BT9-001"), 3);
    s = recordAdjustment(s, item("BT9-002"), 2);
    expect(sessionTotal(s)).toBe(5);
  });
  it("is zero for an empty session", () => {
    expect(sessionTotal([])).toBe(0);
  });
});
