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
  const { users, coverLetters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.coverLetters.findFirst({ where: eq(coverLetters.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { row };
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
  if (typeof body.body !== "string") return NextResponse.json({ success: false, error: "body required" }, { status: 400 });

  const { db } = await import("@/db");
  const { coverLetters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(coverLetters).set({ body: body.body }).where(eq(coverLetters.id, owned.row.id));
  return NextResponse.json({ success: true });
}
