import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";
import { EMAIL_KINDS, type EmailKind } from "@/lib/email/subscriptions";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function getDbUserId(): Promise<number | null> {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const u = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  return u?.id ?? null;
}

export async function GET() {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { listSubscriptions } = await import("@/lib/email/subscriptions");
  return NextResponse.json({ success: true, data: await listSubscriptions(userId) });
}

export async function PATCH(req: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as EmailKind;
  if (!EMAIL_KINDS.includes(kind)) {
    return NextResponse.json({ success: false, error: "Invalid kind" }, { status: 400 });
  }
  const enabled = Boolean(body.enabled);

  const { setSubscription } = await import("@/lib/email/subscriptions");
  await setSubscription(userId, kind, enabled);
  return NextResponse.json({ success: true });
}
