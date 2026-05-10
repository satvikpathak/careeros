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
  if (!dbUser) return NextResponse.json({ success: true, data: null });

  const { canUse } = await import("@/lib/billing/access");

  const [audit, chat] = await Promise.all([
    canUse(dbUser.id, "audit"),
    canUse(dbUser.id, "chat"),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      planKey: audit.planKey,
      audit: { used: audit.used, limit: audit.limit },
      chat: { used: chat.used, limit: chat.limit },
    },
  });
}
