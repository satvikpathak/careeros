import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const row = await db.query.resumeVersions.findFirst({ where: eq(resumeVersions.id, id) });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (row.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || (row.sourceKind === "latex" ? "tex" : "docx");

  if (format === "tex") {
    if (!row.modifiedTex) return NextResponse.json({ success: false, error: "no_tex" }, { status: 400 });
    return new NextResponse(row.modifiedTex, {
      status: 200,
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": 'attachment; filename="resume.tex"',
      },
    });
  }

  if (format === "docx") {
    const { renderDocxFromSegments } = await import("@/lib/rewriter/docx");
    const segments = (row.diffSegments as any[]) || [];
    const buf = await renderDocxFromSegments({
      candidateName: dbUser.name || "Resume",
      segments,
    });
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="resume.docx"',
      },
    });
  }

  return NextResponse.json({ success: false, error: "Invalid format" }, { status: 400 });
}
