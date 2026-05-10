import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { shouldRedirectToOnboarding } from "@/lib/audit/require-onboarded";
import { syncUserWithNeon } from "@/lib/user-sync";
import DashboardClientLayout from "./client-layout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) {
    const clerk = await currentUser();
    if (clerk) {
      const email = clerk.emailAddresses[0]?.emailAddress || "";
      const name = `${clerk.firstName || ""} ${clerk.lastName || ""}`.trim();
      dbUser = await syncUserWithNeon(clerkId, email, name);
    }
  }

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "/dashboard";
  if (dbUser && shouldRedirectToOnboarding(dbUser, pathname)) {
    redirect("/dashboard/onboarding");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
