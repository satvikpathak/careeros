import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET missing — skipping");
    return NextResponse.json({ success: false, error: "not configured" }, { status: 503 });
  }

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: any;
  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(secret);
    event = wh.verify(body, headers);
  } catch {
    return NextResponse.json({ success: false, error: "invalid signature" }, { status: 401 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ success: true, ignored: event.type });
  }

  const clerkId = event.data.id as string;
  const email = event.data.email_addresses?.[0]?.email_address as string | undefined;
  const firstName = (event.data.first_name as string | undefined) || "";
  const lastName = (event.data.last_name as string | undefined) || "";

  if (!email) return NextResponse.json({ success: false, error: "no email" }, { status: 400 });

  const { syncUserWithNeon } = await import("@/lib/user-sync");
  const dbUser = await syncUserWithNeon(clerkId, email, `${firstName} ${lastName}`.trim());

  try {
    const { isInngestConfigured } = await import("@/lib/audit/dev-runner");
    if (isInngestConfigured()) {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({ name: "email/welcome", data: { userId: dbUser.id } });
    }
  } catch (e) {
    console.warn("welcome email enqueue failed", e);
  }

  return NextResponse.json({ success: true });
}
