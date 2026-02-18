import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Synchronizes a Clerk user with the NeonDB users table.
 * If user exists, returns the user record.
 * If not, creates a new user and returns it.
 */
export async function syncUserWithNeon(clerkId: string, email: string, name?: string) {
  try {
    // 1. Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (existingUser) {
      return existingUser;
    }

    // 2. Create new user
    const newUser = await db.insert(users).values({
      clerkId,
      email,
      name: name || null,
      subscriptionTier: "free",
      streakCount: 0,
    }).returning();

    return newUser[0];
  } catch (error) {
    console.error("Error syncing user with NeonDB:", error);
    throw error;
  }
}
