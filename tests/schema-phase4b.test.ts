import { describe, it, expect } from "vitest";
import { outreachDrafts, simulations } from "@/db/schema";
import { getQuota } from "@/lib/billing/plans";

describe("phase 4B schema", () => {
  it("outreachDrafts has required columns", () => {
    const cols = Object.keys(outreachDrafts);
    for (const c of ["id", "userId", "jdId", "recipientName", "recipientTitle", "emailSubject", "emailBody", "dmBody", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("simulations has required columns", () => {
    const cols = Object.keys(simulations);
    for (const c of ["id", "userId", "targetSkills", "horizonMonths", "series", "suggestedSkills", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("getQuota returns 0 for free outreach and simulation", () => {
    expect(getQuota("free", "outreach" as any)).toBe(0);
    expect(getQuota("free", "simulation" as any)).toBe(0);
  });

  it("getQuota returns Infinity for pro outreach and simulation", () => {
    expect(getQuota("pro", "outreach" as any)).toBe(Infinity);
    expect(getQuota("pro", "simulation" as any)).toBe(Infinity);
  });
});
