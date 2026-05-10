import { describe, it, expect } from "vitest";
import { isStale } from "@/lib/applications/stale";

describe("isStale", () => {
  const now = new Date("2026-05-10T00:00:00Z");

  it("saved is stale after 7d", () => {
    const updatedAt = new Date("2026-05-02T00:00:00Z");
    expect(isStale("saved", updatedAt, now)).toBe(true);
  });

  it("saved is fresh at 6d", () => {
    const updatedAt = new Date("2026-05-04T00:00:00Z");
    expect(isStale("saved", updatedAt, now)).toBe(false);
  });

  it("interview stale at 4d", () => {
    const updatedAt = new Date("2026-05-06T00:00:00Z");
    expect(isStale("interview", updatedAt, now)).toBe(true);
  });

  it("offer is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("offer", updatedAt, now)).toBe(false);
  });

  it("rejected is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("rejected", updatedAt, now)).toBe(false);
  });

  it("withdrawn is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("withdrawn", updatedAt, now)).toBe(false);
  });
});
