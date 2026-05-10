import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  const { isDodoConfigured } = await import("@/lib/billing/dodo");
  if (!isDodoConfigured()) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  const clerk = await currentUser();
  if (!clerkId || !clerk) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planKey = body.planKey as "pro" | "team";
  if (!["pro", "team"].includes(planKey)) {
    return NextResponse.json({ success: false, error: "Invalid planKey" }, { status: 400 });
  }

  const { PLANS } = await import("@/lib/billing/plans");
  const productId = PLANS[planKey].dodoProductId;
  if (!productId) {
    return NextResponse.json({ success: false, error: "plan_product_id_missing" }, { status: 503 });
  }

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ success: false, error: "No email" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnUrl = `${appUrl}/dashboard/billing?status=ok`;

  try {
    const { createCheckoutUrl } = await import("@/lib/billing/dodo");
    const url = await createCheckoutUrl({
      productId,
      customer: {
        email,
        name: `${clerk.firstName || ""} ${clerk.lastName || ""}`.trim(),
        customerId: dbUser.dodoCustomerId,
      },
      returnUrl,
      metadata: { userId: String(dbUser.id), planKey },
    });
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error("checkout failed:", err);
    return NextResponse.json({ success: false, error: "checkout_failed" }, { status: 502 });
  }
}
