import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, jds } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { canUse, recordUsage } = await import("@/lib/billing/access");
  const quota = await canUse(dbUser.id, "outreach");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "outreach" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });

  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim().slice(0, 255) : undefined;
  const recipientTitle = typeof body.recipientTitle === "string" ? body.recipientTitle.trim().slice(0, 255) : undefined;

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  const { runOutreach } = await import("@/lib/outreach/run");
  try {
    const result = await runOutreach({
      userId: dbUser.id,
      jdId: jd.id,
      jdText: jd.rawText,
      recipientName,
      recipientTitle,
    });
    await recordUsage(dbUser.id, "outreach", { draftId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("outreach run failed:", err);
    return NextResponse.json({ success: false, error: "outreach_failed" }, { status: 500 });
  }
}
