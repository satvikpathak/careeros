import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const ALLOWED_HORIZONS = new Set([1, 3, 6, 12]);

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { canUse, recordUsage } = await import("@/lib/billing/access");
  const quota = await canUse(dbUser.id, "simulation");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "simulation" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const targetSkills = Array.isArray(body.targetSkills)
    ? body.targetSkills.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 8)
    : [];
  const horizonMonths = Number(body.horizonMonths);

  if (targetSkills.length === 0) {
    return NextResponse.json({ success: false, error: "Choose at least 1 skill" }, { status: 400 });
  }
  if (!ALLOWED_HORIZONS.has(horizonMonths)) {
    return NextResponse.json({ success: false, error: "horizonMonths must be 1, 3, 6, or 12" }, { status: 400 });
  }

  const { runSimulation } = await import("@/lib/simulate/run");
  try {
    const result = await runSimulation({ userId: dbUser.id, targetSkills, horizonMonths });
    await recordUsage(dbUser.id, "simulation", { simulationId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("simulation run failed:", err);
    return NextResponse.json({ success: false, error: "simulation_failed" }, { status: 500 });
  }
}
