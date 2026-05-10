import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstSub, insertUsage, findManyUsage } = vi.hoisted(() => ({
  findFirstSub: vi.fn(),
  insertUsage: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
  findManyUsage: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: findFirstSub },
      usageEvents: { findMany: findManyUsage },
    },
    insert: insertUsage,
  },
}));

import { getUserPlan, canUse } from "@/lib/billing/access";

describe("getUserPlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns free when no subscription", async () => {
    findFirstSub.mockResolvedValue(null);
    expect(await getUserPlan(1)).toBe("free");
  });

  it("returns plan when active", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "active" });
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns plan during cancellation grace (period_end in future)", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "cancelled", currentPeriodEnd: new Date(Date.now() + 86400000) });
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns free after cancelled period_end", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "cancelled", currentPeriodEnd: new Date(Date.now() - 86400000) });
    expect(await getUserPlan(1)).toBe("free");
  });

  it("returns plan during past_due grace", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - 86400000) });
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns free after past_due grace expires", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - 8 * 86400000) });
    expect(await getUserPlan(1)).toBe("free");
  });
});

describe("canUse", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("free user blocked after 1 audit", async () => {
    findFirstSub.mockResolvedValue(null);
    findManyUsage.mockResolvedValue([{ id: 1 }]);
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(false);
    expect(r.planKey).toBe("free");
    expect(r.limit).toBe(1);
    expect(r.used).toBe(1);
  });

  it("free user allowed at 0 audits", async () => {
    findFirstSub.mockResolvedValue(null);
    findManyUsage.mockResolvedValue([]);
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(true);
  });

  it("pro user always allowed", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "active" });
    findManyUsage.mockResolvedValue(new Array(1000).fill({}));
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(true);
  });
});
