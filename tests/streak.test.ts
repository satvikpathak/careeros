import { describe, it, expect } from "vitest";
import { computeStreakDays, todayUtcDate } from "@/lib/checkin/streak";

describe("computeStreakDays", () => {
  it("returns 0 for no rows", () => {
    expect(computeStreakDays([], "2026-05-10")).toBe(0);
  });

  it("returns 1 when only today is checked in", () => {
    expect(computeStreakDays(["2026-05-10"], "2026-05-10")).toBe(1);
  });

  it("returns 3 for today + 2 previous days", () => {
    expect(computeStreakDays(["2026-05-08", "2026-05-09", "2026-05-10"], "2026-05-10")).toBe(3);
  });

  it("breaks on a 1-day gap", () => {
    expect(computeStreakDays(["2026-05-07", "2026-05-09", "2026-05-10"], "2026-05-10")).toBe(2);
  });

  it("counts streak ending yesterday when today is missing", () => {
    expect(computeStreakDays(["2026-05-08", "2026-05-09"], "2026-05-10")).toBe(2);
  });
});

describe("todayUtcDate", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayUtcDate(new Date("2026-05-10T15:30:00Z"))).toBe("2026-05-10");
  });
});
