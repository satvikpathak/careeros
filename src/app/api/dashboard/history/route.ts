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
  const { careerAudits, users } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  const { getAuditTrend } = await import("@/lib/audit/trend");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: { audits: [], trend: [] } });

  const audits = await db.query.careerAudits.findMany({
    where: eq(careerAudits.userId, dbUser.id),
    orderBy: [desc(careerAudits.createdAt)],
    limit: 50,
  });
  const trend = await getAuditTrend(dbUser.id);

  return NextResponse.json({ success: true, data: { audits, trend } });
}
