import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: { planKey: "free", status: null, currentPeriodEnd: null } });

  const { getUserPlan } = await import("@/lib/billing/access");
  const planKey = await getUserPlan(dbUser.id);

  return NextResponse.json({
    success: true,
    data: {
      planKey,
      status: dbUser.subscriptionStatus ?? null,
      currentPeriodEnd: dbUser.currentPeriodEnd ?? null,
      hasDodoCustomer: Boolean(dbUser.dodoCustomerId),
    },
  });
}
