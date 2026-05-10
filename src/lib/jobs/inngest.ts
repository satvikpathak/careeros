import { Inngest } from "inngest";
import { sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron } from "./email-functions";

export const inngest = new Inngest({ id: "careeros" });

export const auditRun = inngest.createFunction(
  { id: "audit-run", retries: 1, triggers: [{ event: "audit/run" }] },
  async ({ event, step }) => {
    const { runAuditJob } = await import("@/lib/audit/runner");
    await step.run("execute", () => runAuditJob(event.data.jobId as number));
  }
);

export const inngestFunctions = [auditRun, sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron];
