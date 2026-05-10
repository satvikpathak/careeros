import { describe, it, expect } from "vitest";
import { project, type SkillLift, type ProjectionPoint } from "@/lib/simulate/project";

describe("project", () => {
  it("returns horizon+1 points", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [],
      horizonMonths: 6,
    });
    expect(out.length).toBe(7);
  });

  it("zero lifts and zero slope gives flat line at baseline", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [],
      horizonMonths: 3,
    });
    for (const p of out) {
      expect(p.readiness).toBe(60);
      expect(p.marketMatch).toBe(50);
    }
  });

  it("month 0 always equals baselineLatest", () => {
    const out = project({
      baselineLatest: { readiness: 70, marketMatch: 65 },
      baselineSlope: { readiness: 1, marketMatch: 2 },
      lifts: [{ skill: "k8s", readinessLift: 5, marketMatchLift: 8 }],
      horizonMonths: 6,
    });
    expect(out[0].month).toBe(0);
    expect(out[0].readiness).toBe(70);
    expect(out[0].marketMatch).toBe(65);
  });

  it("readiness is monotonically non-decreasing with positive slope and lift", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 1, marketMatch: 1 },
      lifts: [{ skill: "x", readinessLift: 10, marketMatchLift: 10 }],
      horizonMonths: 12,
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].readiness).toBeGreaterThanOrEqual(out[i - 1].readiness);
      expect(out[i].marketMatch).toBeGreaterThanOrEqual(out[i - 1].marketMatch);
    }
  });

  it("lift is capped at 100", () => {
    const out = project({
      baselineLatest: { readiness: 95, marketMatch: 90 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [{ skill: "x", readinessLift: 50, marketMatchLift: 50 }],
      horizonMonths: 6,
    });
    expect(out[out.length - 1].readiness).toBeLessThanOrEqual(100);
    expect(out[out.length - 1].marketMatch).toBeLessThanOrEqual(100);
  });

  it("sums multiple lifts", () => {
    const out = project({
      baselineLatest: { readiness: 50, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [
        { skill: "a", readinessLift: 5, marketMatchLift: 3 },
        { skill: "b", readinessLift: 7, marketMatchLift: 4 },
      ],
      horizonMonths: 12,
    });
    expect(out[out.length - 1].readiness).toBeCloseTo(62, 0);
    expect(out[out.length - 1].marketMatch).toBeCloseTo(57, 0);
  });

  it("horizon=1 returns 2 points", () => {
    const out = project({
      baselineLatest: { readiness: 50, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [{ skill: "x", readinessLift: 4, marketMatchLift: 4 }],
      horizonMonths: 1,
    });
    expect(out.length).toBe(2);
  });
});
