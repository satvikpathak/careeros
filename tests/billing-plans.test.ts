import { describe, it, expect } from "vitest";
import { PLANS, getQuota } from "@/lib/billing/plans";

describe("plans", () => {
  it("has free, pro, team", () => {
    expect(PLANS.free).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.team).toBeDefined();
  });

  it("free has finite audit quota", () => {
    expect(PLANS.free.quotas.auditPerMonth).toBe(1);
  });

  it("pro has infinite audits", () => {
    expect(PLANS.pro.quotas.auditPerMonth).toBe(Infinity);
  });

  it("getQuota returns numeric limit", () => {
    expect(getQuota("free", "audit")).toBe(1);
    expect(getQuota("pro", "audit")).toBe(Infinity);
    expect(getQuota("free", "chat")).toBe(20);
  });
});
