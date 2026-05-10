import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetRole = String(formData.get("targetRole") || "").trim();
    const githubUrl = String(formData.get("githubUrl") || "").trim();

    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ success: false, error: "Only PDF accepted" }, { status: 400 });

    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    const user = await currentUser();
    if (!clerkId || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { syncUserWithNeon } = await import("@/lib/user-sync");
    const dbUser = await syncUserWithNeon(clerkId, user.emailAddresses[0].emailAddress, `${user.firstName || ""} ${user.lastName || ""}`.trim());

    const { canUse, recordUsage } = await import("@/lib/billing/access");
    const quota = await canUse(dbUser.id, "audit");
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        error: "quota_exceeded",
        data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "audit" },
      }, { status: 402 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let s3Url = `local:///tmp/${file.name}`;
    try {
      const { uploadToS3 } = await import("@/lib/s3");
      s3Url = await uploadToS3(bytes, file.name, file.type);
    } catch {
      const fs = (await import("node:fs/promises")).default;
      const path = (await import("node:path")).default;
      const os = (await import("node:os")).default;
      const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
      await fs.writeFile(tmpPath, bytes);
      s3Url = `local://${tmpPath}`;
    }

    const { db } = await import("@/db");
    const { auditJobs } = await import("@/db/schema");

    const [job] = await db.insert(auditJobs).values({
      userId: dbUser.id,
      status: "queued",
      s3Url,
      fileName: file.name,
      targetRole,
      githubUrl: githubUrl || null,
    }).returning();

    await recordUsage(dbUser.id, "audit", { jobId: job.id });

    const { isInngestConfigured, fireAndForget } = await import("@/lib/audit/dev-runner");
    if (isInngestConfigured()) {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({ name: "audit/run", data: { jobId: job.id } });
    } else {
      fireAndForget(job.id);
    }

    return NextResponse.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error("audit/start error:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
