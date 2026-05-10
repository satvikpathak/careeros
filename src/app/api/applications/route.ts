import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function getDbUser() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
}

export async function GET() {
  const dbUser = await getDbUser();
  if (!dbUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { listApplications } = await import("@/lib/applications/repo");
  const rows = await listApplications(dbUser.id);
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  const dbUser = await getDbUser();
  if (!dbUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.jobTitle || !body.company) {
    return NextResponse.json({ success: false, error: "jobTitle and company required" }, { status: 400 });
  }
  const { createApplication } = await import("@/lib/applications/repo");
  const row = await createApplication(dbUser.id, {
    jobTitle: body.jobTitle,
    company: body.company,
    location: body.location,
    sourceUrl: body.sourceUrl,
    jobSnapshot: body.jobSnapshot,
  });
  return NextResponse.json({ success: true, data: row });
}
