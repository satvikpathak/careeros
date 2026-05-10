import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { shouldRedirectToOnboarding } from "@/lib/audit/require-onboarded";
import DashboardClientLayout from "./client-layout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "/dashboard";
  if (dbUser && shouldRedirectToOnboarding(dbUser, pathname)) {
    redirect("/dashboard/onboarding");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
