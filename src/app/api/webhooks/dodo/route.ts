import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.DODO_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });

  let event: any;
  try {
    const { verifyWebhook } = await import("@/lib/billing/dodo");
    event = await verifyWebhook({ body, headers });
  } catch (err) {
    console.warn("[dodo-webhook] signature verify failed:", err);
    return NextResponse.json({ success: false, error: "invalid signature" }, { status: 401 });
  }

  const { db } = await import("@/db");
  const { webhookEvents } = await import("@/db/schema");

  const externalId = event.id || event.event_id || `${event.type}:${Date.now()}`;
  try {
    await db.insert(webhookEvents).values({
      provider: "dodo",
      externalId,
      eventType: event.type,
      payload: event,
    });
  } catch (e: any) {
    if (String(e?.message || "").includes("duplicate") || e?.code === "23505") {
      return NextResponse.json({ success: true, deduped: true });
    }
    throw e;
  }

  try {
    const { handleDodoEvent } = await import("@/lib/billing/webhook-handlers");
    await handleDodoEvent(event);
  } catch (err) {
    console.error("[dodo-webhook] handler failed:", err);
    return NextResponse.json({ success: false, error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
