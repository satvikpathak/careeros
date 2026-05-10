import { inngest } from "./inngest";

export const sendWelcome = inngest.createFunction(
  { id: "email-welcome", retries: 2, triggers: [{ event: "email/welcome" }] },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const userId = event.data.userId as number;
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;
      const { sendEmail } = await import("@/lib/email/resend");
      const { WelcomeEmail } = await import("@/lib/email/templates/welcome");
      await sendEmail({
        to: u.email,
        subject: "Welcome to CareerOS",
        react: WelcomeEmail({ name: u.name ?? undefined }),
        kind: "welcome",
        userId,
      });
    });
  }
);

export const sendAuditComplete = inngest.createFunction(
  { id: "email-audit-complete", retries: 2, triggers: [{ event: "email/audit-complete" }] },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const { userId, auditId } = event.data as { userId: number; auditId: number };
      const { db } = await import("@/db");
      const { users, careerAudits } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;
      const audit = await db.query.careerAudits.findFirst({ where: eq(careerAudits.id, auditId) });
      if (!audit) return;
      const { sendEmail } = await import("@/lib/email/resend");
      const { AuditCompleteEmail } = await import("@/lib/email/templates/audit-complete");
      const ats = (audit.atsKeywordAnalysis as any) || {};
      await sendEmail({
        to: u.email,
        subject: "Your CareerOS audit is ready",
        react: AuditCompleteEmail({
          readinessScore: audit.readinessScore ?? 0,
          marketMatchScore: audit.marketMatchScore ?? 0,
          topGaps: Array.isArray(ats.skill_gaps) ? ats.skill_gaps : [],
        }),
        kind: "audit_complete",
        userId,
      });
    });
  }
);

export const sendWeeklyDigest = inngest.createFunction(
  { id: "email-weekly-digest", retries: 2, triggers: [{ event: "email/weekly-digest" }] },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const userId = event.data.userId as number;
      const { db } = await import("@/db");
      const { users, careerAudits } = await import("@/db/schema");
      const { eq, desc } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;

      const last2 = await db.query.careerAudits.findMany({
        where: eq(careerAudits.userId, userId),
        orderBy: [desc(careerAudits.createdAt)],
        limit: 2,
      });
      const readinessDelta =
        last2.length === 2 ? (last2[0].readinessScore ?? 0) - (last2[1].readinessScore ?? 0) : 0;

      const { listStaleApplications } = await import("@/lib/applications/repo");
      const stale = await listStaleApplications(userId);
      const { getStreak } = await import("@/lib/checkin/streak");
      const { streakDays } = await getStreak(userId);

      const { sendEmail } = await import("@/lib/email/resend");
      const { WeeklyDigestEmail } = await import("@/lib/email/templates/weekly-digest");

      await sendEmail({
        to: u.email,
        subject: "Your week on CareerOS",
        react: WeeklyDigestEmail({
          streakDays,
          readinessDelta,
          staleApps: stale.slice(0, 3).map((a) => ({ jobTitle: a.jobTitle, company: a.company, status: a.status })),
        }),
        kind: "weekly_digest",
        userId,
      });
    });
  }
);

export const weeklyDigestCron = inngest.createFunction(
  { id: "email-weekly-digest-cron", triggers: [{ cron: "0 8 * * 1" }] },
  async ({ step }) => {
    await step.run("fanout", async () => {
      const { db } = await import("@/db");
      const all = await db.query.users.findMany();
      const events = all.map((u) => ({
        name: "email/weekly-digest" as const,
        data: { userId: u.id },
      }));
      if (events.length > 0) {
        await inngest.send(events);
      }
    });
  }
);
