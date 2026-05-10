import { describe, it, expect } from "vitest";
import { subscriptions, usageEvents, webhookEvents, users } from "@/db/schema";

describe("phase 3 schema", () => {
  it("subscriptions has required columns", () => {
    const cols = Object.keys(subscriptions);
    for (const c of ["id", "userId", "dodoSubscriptionId", "dodoCustomerId", "planKey", "status", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "raw", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("usageEvents has required columns", () => {
    const cols = Object.keys(usageEvents);
    for (const c of ["id", "userId", "kind", "occurredAt", "metadata"]) {
      expect(cols).toContain(c);
    }
  });

  it("webhookEvents has required columns", () => {
    const cols = Object.keys(webhookEvents);
    for (const c of ["id", "provider", "externalId", "eventType", "receivedAt", "payload"]) {
      expect(cols).toContain(c);
    }
  });

  it("users has billing columns", () => {
    const cols = Object.keys(users);
    for (const c of ["dodoCustomerId", "subscriptionStatus", "currentPeriodEnd"]) {
      expect(cols).toContain(c);
    }
  });
});
