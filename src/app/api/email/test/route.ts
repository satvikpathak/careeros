import * as React from "react";
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST() {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  const clerk = await currentUser();
  if (!clerkId || !clerk) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ success: false, error: "No email on file" }, { status: 400 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { sendEmail } = await import("@/lib/email/resend");

  // Minimal inline test element so this route doesn't depend on Task 14 templates.
  const TestElement = React.createElement(
    "div",
    null,
    React.createElement("h1", null, "CareerOS test email"),
    React.createElement("p", null, `Hello ${clerk.firstName || "there"}, this is a delivery test.`)
  );

  const result = await sendEmail({
    to: email,
    subject: "CareerOS test",
    react: TestElement as any,
    kind: "welcome",
    userId: dbUser.id,
  });
  return NextResponse.json({ success: true, data: result });
}
