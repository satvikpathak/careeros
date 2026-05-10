import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function loadOwned(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: "Invalid id", status: 400 as const };

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized", status: 401 as const };

  const { db } = await import("@/db");
  const { users, resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.resumeVersions.findFirst({ where: eq(resumeVersions.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { row, dbUserId: dbUser.id };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });
  return NextResponse.json({ success: true, data: owned.row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.diffSegments)) {
    return NextResponse.json({ success: false, error: "diffSegments array required" }, { status: 400 });
  }

  const { db } = await import("@/db");
  const { resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  let modifiedTex: string | null = (owned.row.modifiedTex as string | null) ?? null;
  if (owned.row.sourceKind === "latex" && typeof owned.row.originalTex === "string") {
    const { extractBullets, applyBulletEdits } = await import("@/lib/rewriter/latex");
    const bullets = extractBullets(owned.row.originalTex);
    const segs = body.diffSegments as { index: number; suggested: string; original: string; accepted: boolean | null }[];
    const edits = bullets.map((b, i) => {
      const seg = segs[i];
      const text = seg && seg.accepted === false ? seg.original : seg?.suggested ?? b.text;
      return { ...b, suggested: text };
    });
    modifiedTex = applyBulletEdits(owned.row.originalTex, edits);
  }

  await db.update(resumeVersions).set({
    diffSegments: body.diffSegments,
    modifiedTex,
  }).where(eq(resumeVersions.id, owned.row.id));

  return NextResponse.json({ success: true });
}
