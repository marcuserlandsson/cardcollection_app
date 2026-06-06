import { describe, it, expect } from "vitest";
import { generateShareToken } from "@/lib/share-token";

describe("generateShareToken", () => {
  it("returns a 16-char token by default", () => {
    expect(generateShareToken()).toHaveLength(16);
  });

  it("respects a custom length", () => {
    expect(generateShareToken(24)).toHaveLength(24);
  });

  it("uses only URL-safe characters", () => {
    expect(generateShareToken(256)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces a different token on each call", () => {
    expect(generateShareToken()).not.toBe(generateShareToken());
  });
});
