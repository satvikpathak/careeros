import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function loadOwnedApp(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: "Invalid id", status: 400 as const };

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized", status: 401 as const };

  const { db } = await import("@/db");
  const { applications, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.applications.findFirst({ where: eq(applications.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { dbUserId: dbUser.id, id };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const owned = await loadOwnedApp(idStr);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  const { updateApplication } = await import("@/lib/applications/repo");
  const row = await updateApplication(owned.dbUserId, owned.id, body);
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const owned = await loadOwnedApp(idStr);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const { deleteApplication } = await import("@/lib/applications/repo");
  await deleteApplication(owned.dbUserId, owned.id);
  return NextResponse.json({ success: true });
}
