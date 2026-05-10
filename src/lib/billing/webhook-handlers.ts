import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PlanKey } from "./plans";

interface DodoEvent {
  type: string;
  data: {
    subscription_id?: string;
    customer?: { customer_id?: string };
    product_id?: string;
    status?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
  };
}

function planKeyForProduct(productId: string | undefined): PlanKey {
  if (!productId) return "pro";
  if (productId === process.env.DODO_TEAM_PRODUCT_ID) return "team";
  return "pro";
}

async function findUserIdByDodoCustomer(dodoCustomerId: string | undefined): Promise<number | null> {
  if (!dodoCustomerId) return null;
  const u = await db.query.users.findFirst({ where: eq(users.dodoCustomerId, dodoCustomerId) });
  return u?.id ?? null;
}

async function upsertSubscription(userId: number, ev: DodoEvent, status: string) {
  const dodoSubId = ev.data.subscription_id || "";
  const dodoCustId = ev.data.customer?.customer_id || "";
  const planKey = planKeyForProduct(ev.data.product_id);
  const periodStart = ev.data.current_period_start ? new Date(ev.data.current_period_start) : null;
  const periodEnd = ev.data.current_period_end ? new Date(ev.data.current_period_end) : null;
  const cancelAtPeriodEnd = Boolean(ev.data.cancel_at_period_end);

  await db.insert(subscriptions).values({
    userId,
    dodoSubscriptionId: dodoSubId,
    dodoCustomerId: dodoCustId,
    planKey,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    raw: ev as any,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      dodoSubscriptionId: dodoSubId,
      dodoCustomerId: dodoCustId,
      planKey,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
      raw: ev as any,
      updatedAt: new Date(),
    },
  });

  await db.update(users).set({
    subscriptionTier: planKey,
    subscriptionStatus: status,
    currentPeriodEnd: periodEnd,
  }).where(eq(users.id, userId));
}

async function markUserStatus(userId: number, status: string) {
  await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, userId));
}

export async function handleDodoEvent(ev: DodoEvent): Promise<void> {
  const customerId = ev.data.customer?.customer_id;
  const userId = await findUserIdByDodoCustomer(customerId);
  if (!userId) {
    console.warn(`[dodo-webhook] no user for customer_id=${customerId} type=${ev.type}`);
    return;
  }

  switch (ev.type) {
    case "subscription.active":
    case "subscription.created":
    case "subscription.renewed":
      await upsertSubscription(userId, ev, "active");
      return;

    case "subscription.updated":
      await upsertSubscription(userId, ev, ev.data.status || "active");
      return;

    case "subscription.cancelled":
      await upsertSubscription(userId, ev, "cancelled");
      return;

    case "subscription.expired":
      await upsertSubscription(userId, ev, "expired");
      return;

    case "payment.failed":
      await markUserStatus(userId, "past_due");
      return;

    case "payment.succeeded":
      await markUserStatus(userId, "active");
      return;

    default:
      return;
  }
}
