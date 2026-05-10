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
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  let text = typeof body.text === "string" ? body.text.trim() : "";

  if (!url && !text) {
    return NextResponse.json({ success: false, error: "Provide url or text" }, { status: 400 });
  }

  if (url && !text) {
    try {
      const { fetchJdText } = await import("@/lib/jd/fetch");
      text = await fetchJdText(url);
    } catch (err: any) {
      const code = err?.code;
      if (code === "host_blocked") {
        return NextResponse.json({ success: false, error: "host_blocked", message: "We can't fetch that domain — paste the JD text instead." }, { status: 400 });
      }
      if (code === "too_large") {
        return NextResponse.json({ success: false, error: "too_large" }, { status: 413 });
      }
      return NextResponse.json({ success: false, error: "fetch_failed", message: "Couldn't fetch this JD. Try pasting the text." }, { status: 422 });
    }
  }

  if (!text || text.length < 50) {
    return NextResponse.json({ success: false, error: "JD text too short" }, { status: 400 });
  }

  const { getOrCreateJd } = await import("@/lib/jd/cache");
  const result = await getOrCreateJd({ userId: dbUser.id, rawText: text, sourceUrl: url || null });

  return NextResponse.json({ success: true, data: result });
}
