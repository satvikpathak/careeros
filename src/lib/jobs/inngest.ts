import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "careeros" });

export const auditRun = inngest.createFunction(
  { id: "audit-run", retries: 1, triggers: [{ event: "audit/run" }] },
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- runner is added in Task 5
    const { runAuditJob } = await import("@/lib/audit/runner");
    await step.run("execute", () => runAuditJob(event.data.jobId as number));
  }
);

export const inngestFunctions = [auditRun];
