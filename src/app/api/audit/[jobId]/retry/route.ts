import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: jobIdStr } = await ctx.params;
  const jobId = Number(jobIdStr);
  if (!Number.isFinite(jobId)) return NextResponse.json({ success: false, error: "Invalid job id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { auditJobs, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const job = await db.query.auditJobs.findFirst({ where: eq(auditJobs.id, jobId) });
  if (!job) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (job.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  if (job.status !== "failed") return NextResponse.json({ success: false, error: "Only failed jobs can be retried" }, { status: 400 });

  await db.update(auditJobs)
    .set({ status: "queued", error: null, progress: {}, startedAt: null, finishedAt: null })
    .where(eq(auditJobs.id, jobId));

  const { isInngestConfigured, fireAndForget } = await import("@/lib/audit/dev-runner");
  if (isInngestConfigured()) {
    const { inngest } = await import("@/lib/jobs/inngest");
    await inngest.send({ name: "audit/run", data: { jobId } });
  } else {
    fireAndForget(jobId);
  }

  return NextResponse.json({ success: true, data: { jobId } });
}
