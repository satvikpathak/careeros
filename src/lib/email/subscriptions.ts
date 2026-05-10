import { db } from "@/db";
import { emailSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const EMAIL_KINDS = ["welcome", "audit_complete", "weekly_digest", "streak_at_risk"] as const;
export type EmailKind = typeof EMAIL_KINDS[number];

export async function isEnabled(userId: number, kind: EmailKind): Promise<boolean> {
  const row = await db.query.emailSubscriptions.findFirst({
    where: and(eq(emailSubscriptions.userId, userId), eq(emailSubscriptions.kind, kind)),
  });
  return row ? row.enabled : true;
}

export async function listSubscriptions(userId: number): Promise<Record<EmailKind, boolean>> {
  const rows = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.userId, userId),
  });
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.kind] = r.enabled;
  const out: Record<string, boolean> = {};
  for (const k of EMAIL_KINDS) out[k] = map[k] ?? true;
  return out as Record<EmailKind, boolean>;
}

export async function setSubscription(userId: number, kind: EmailKind, enabled: boolean): Promise<void> {
  await db.insert(emailSubscriptions)
    .values({ userId, kind, enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [emailSubscriptions.userId, emailSubscriptions.kind],
      set: { enabled, updatedAt: new Date() },
    });
}
