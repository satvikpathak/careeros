import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const MAX_TEX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, jds } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { canUse, recordUsage } = await import("@/lib/billing/access");
  const quota = await canUse(dbUser.id, "rewriter");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "rewriter" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });
  const sourceKind = body.sourceKind === "latex" ? "latex" : "pdf";

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  let tex: string | undefined;
  if (sourceKind === "latex") {
    if (typeof body.tex === "string" && body.tex.trim().length > 0) {
      tex = body.tex;
    } else if (typeof body.texUrl === "string") {
      try {
        const u = new URL(body.texUrl);
        const okHosts = ["raw.githubusercontent.com", "gist.githubusercontent.com", "overleaf.com"];
        if (!okHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) {
          return NextResponse.json({ success: false, error: "tex_host_blocked" }, { status: 400 });
        }
        const res = await fetch(body.texUrl);
        if (!res.ok) return NextResponse.json({ success: false, error: "tex_fetch_failed" }, { status: 422 });
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_TEX_BYTES) return NextResponse.json({ success: false, error: "tex_too_large" }, { status: 413 });
        tex = buf.toString("utf8");
      } catch {
        return NextResponse.json({ success: false, error: "tex_fetch_failed" }, { status: 422 });
      }
    } else {
      return NextResponse.json({ success: false, error: "tex or texUrl required for latex flow" }, { status: 400 });
    }
  }

  const { runRewriter } = await import("@/lib/rewriter/run");
  try {
    const result = await runRewriter({
      userId: dbUser.id,
      jdId: jd.id,
      jdParsed: jd.parsed as any,
      jdText: jd.rawText,
      source: sourceKind === "pdf" ? { kind: "pdf" } : { kind: "latex", tex: tex! },
    });
    await recordUsage(dbUser.id, "rewriter", { versionId: result.versionId });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file", message: "Upload your resume first." }, { status: 400 });
    }
    console.error("rewriter run failed:", err);
    return NextResponse.json({ success: false, error: "rewriter_failed" }, { status: 500 });
  }
}
