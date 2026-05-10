import { runAuditJob } from "./runner";

/**
 * In-process job execution for local dev when Inngest credentials are missing.
 * Returns immediately; the actual audit runs in the background.
 */
export function fireAndForget(jobId: number): void {
  runAuditJob(jobId).catch((err) => {
    console.error(`dev-runner: audit ${jobId} failed`, err);
  });
}

export function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY);
}
