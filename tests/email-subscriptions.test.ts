import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { emailSubscriptions: { findFirst: vi.fn(), findMany: vi.fn() } },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => Promise.resolve()) })) })),
  },
}));

import { isEnabled, EMAIL_KINDS } from "@/lib/email/subscriptions";
import { db } from "@/db";

describe("email subscriptions", () => {
  it("defaults to enabled when no row exists", async () => {
    (db.query.emailSubscriptions.findFirst as any).mockResolvedValue(null);
    expect(await isEnabled(7, "weekly_digest")).toBe(true);
  });

  it("respects existing enabled=false", async () => {
    (db.query.emailSubscriptions.findFirst as any).mockResolvedValue({ enabled: false });
    expect(await isEnabled(7, "weekly_digest")).toBe(false);
  });

  it("exports the canonical kind list", () => {
    expect(EMAIL_KINDS).toEqual(["welcome", "audit_complete", "weekly_digest", "streak_at_risk"]);
  });
});
