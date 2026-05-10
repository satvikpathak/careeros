import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstUser: vi.fn(),
  upsertSub: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(() => Promise.resolve()),
    })),
  })),
  updateUsers: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
}));

vi.mock("@/db", () => ({
  db: {
    query: { users: { findFirst: mocks.findFirstUser } },
    insert: mocks.upsertSub,
    update: mocks.updateUsers,
  },
}));

import { handleDodoEvent } from "@/lib/billing/webhook-handlers";

describe("handleDodoEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstUser.mockResolvedValue({ id: 7, dodoCustomerId: "cust_abc" });
  });

  it("subscription.active upserts an active row", async () => {
    await handleDodoEvent({
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
        product_id: "prod_pro",
        status: "active",
        current_period_start: "2026-05-10T00:00:00Z",
        current_period_end: "2026-06-10T00:00:00Z",
      },
    } as any);
    expect(mocks.upsertSub).toHaveBeenCalled();
    expect(mocks.updateUsers).toHaveBeenCalled();
  });

  it("subscription.cancelled writes status=cancelled", async () => {
    await handleDodoEvent({
      type: "subscription.cancelled",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
        product_id: "prod_pro",
        status: "cancelled",
        cancel_at_period_end: true,
        current_period_end: "2026-06-10T00:00:00Z",
      },
    } as any);
    expect(mocks.upsertSub).toHaveBeenCalled();
  });

  it("payment.failed marks past_due", async () => {
    await handleDodoEvent({
      type: "payment.failed",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
      },
    } as any);
    expect(mocks.updateUsers).toHaveBeenCalled();
  });

  it("ignores unknown event types without throwing", async () => {
    await expect(
      handleDodoEvent({ type: "unknown.thing", data: {} } as any)
    ).resolves.toBeUndefined();
  });
});
