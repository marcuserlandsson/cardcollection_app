import { describe, it, expect } from "vitest";
import {
  computeImageLayout,
  IMAGE_WIDTH,
  IMAGE_CAP,
} from "@/lib/share-image";

describe("computeImageLayout", () => {
  it("has a header + footer only for an empty list", () => {
    const l = computeImageLayout(0);
    expect(l).toMatchObject({ shown: 0, remaining: 0, rows: 0, width: IMAGE_WIDTH, height: 160 });
  });

  it("one card is one row", () => {
    const l = computeImageLayout(1);
    expect(l).toMatchObject({ shown: 1, remaining: 0, rows: 1, height: 384 });
  });

  it("six cards fit on one row", () => {
    expect(computeImageLayout(6).rows).toBe(1);
  });

  it("seven cards wrap to two rows and add a row of height", () => {
    const l = computeImageLayout(7);
    expect(l.rows).toBe(2);
    expect(l.height).toBe(624);
  });

  it("caps shown tiles at the cap and reports the remainder", () => {
    const l = computeImageLayout(IMAGE_CAP + 5);
    expect(l.shown).toBe(IMAGE_CAP);
    expect(l.remaining).toBe(5);
    expect(l.rows).toBe(10);
  });

  it("treats negative counts as zero", () => {
    expect(computeImageLayout(-3)).toMatchObject({ shown: 0, remaining: 0, rows: 0 });
  });
});
