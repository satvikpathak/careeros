import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const FREE_SUGGESTION_LIMIT = 3;

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, jds } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { getUserPlan, canUse, recordUsage } = await import("@/lib/billing/access");
  const plan = await getUserPlan(dbUser.id);

  const quotaKind = plan === "free" ? "audit" : "rewriter";
  const quota = await canUse(dbUser.id, quotaKind as any);
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: quotaKind },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  const parsed = (jd.parsed as any) || {};
  const jdKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

  const { runGap } = await import("@/lib/gap/run");
  try {
    const result = await runGap({ userId: dbUser.id, jdId: jd.id, jdText: jd.rawText, jdKeywords });
    await recordUsage(dbUser.id, quotaKind as any, { gapReportId: result.id });

    const truncated = plan === "free" && result.suggestions.length > FREE_SUGGESTION_LIMIT;
    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        coverage: result.coverage,
        suggestions: truncated ? result.suggestions.slice(0, FREE_SUGGESTION_LIMIT) : result.suggestions,
        truncated,
      },
    });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("gap analyze failed:", err);
    return NextResponse.json({ success: false, error: "gap_failed" }, { status: 500 });
  }
}
