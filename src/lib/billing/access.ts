import { db } from "@/db";
import { subscriptions, usageEvents } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { getQuota, type PlanKey, type UsageKind } from "./plans";

const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserPlan(userId: number): Promise<PlanKey> {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  if (!sub) return "free";

  const status = sub.status;
  const planKey = sub.planKey as PlanKey;

  if (status === "active" || status === "trialing") return planKey;

  if (status === "past_due") {
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    if (!periodEnd) return "free";
    const graceEnd = new Date(periodEnd.getTime() + PAST_DUE_GRACE_MS);
    return graceEnd > new Date() ? planKey : "free";
  }

  if (status === "cancelled") {
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    if (periodEnd && periodEnd > new Date()) return planKey;
    return "free";
  }

  return "free";
}

export interface QuotaResult {
  allowed: boolean;
  planKey: PlanKey;
  used: number;
  limit: number;
  reason?: string;
}

function windowStart(kind: UsageKind): Date {
  const now = new Date();
  if (kind === "chat") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export async function canUse(userId: number, kind: UsageKind): Promise<QuotaResult> {
  const plan = await getUserPlan(userId);
  const limit = getQuota(plan, kind);

  if (limit === Infinity) {
    return { allowed: true, planKey: plan, used: 0, limit: Infinity };
  }
  if (limit === 0) {
    return { allowed: false, planKey: plan, used: 0, limit: 0, reason: `${kind} not in your plan` };
  }

  const since = windowStart(kind);
  const rows = await db.query.usageEvents.findMany({
    where: and(eq(usageEvents.userId, userId), eq(usageEvents.kind, kind), gte(usageEvents.occurredAt, since)),
  });
  const used = rows.length;

  return { allowed: used < limit, planKey: plan, used, limit };
}

export async function recordUsage(userId: number, kind: UsageKind, metadata?: Record<string, any>): Promise<void> {
  await db.insert(usageEvents).values({ userId, kind, metadata });
}
