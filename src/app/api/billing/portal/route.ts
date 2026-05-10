import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST() {
  const { isDodoConfigured } = await import("@/lib/billing/dodo");
  if (!isDodoConfigured()) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser?.dodoCustomerId) {
    return NextResponse.json({ success: false, error: "No Dodo customer on file" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { createPortalUrl } = await import("@/lib/billing/dodo");
    const url = await createPortalUrl({
      customerId: dbUser.dodoCustomerId,
      returnUrl: `${appUrl}/dashboard/billing`,
    });
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error("portal failed:", err);
    return NextResponse.json({ success: false, error: "portal_failed" }, { status: 502 });
  }
}
