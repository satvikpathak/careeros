import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { careerAudits: { findMany: vi.fn() } },
  },
}));

import { getAuditTrend } from "@/lib/audit/trend";
import { db } from "@/db";

describe("getAuditTrend", () => {
  it("returns chronologically-ordered series", async () => {
    (db.query.careerAudits.findMany as any).mockResolvedValue([
      { createdAt: new Date("2026-03-01"), readinessScore: 70, marketMatchScore: 65 },
      { createdAt: new Date("2026-04-01"), readinessScore: 78, marketMatchScore: 72 },
      { createdAt: new Date("2026-05-01"), readinessScore: 84, marketMatchScore: 80 },
    ]);
    const series = await getAuditTrend(1);
    expect(series.length).toBe(3);
    expect(series[0].readiness).toBe(70);
    expect(series[2].readiness).toBe(84);
    expect(series[0].date < series[2].date).toBe(true);
  });

  it("returns [] when no audits", async () => {
    (db.query.careerAudits.findMany as any).mockResolvedValue([]);
    const series = await getAuditTrend(1);
    expect(series).toEqual([]);
  });
});
