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
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name?.trim() || null;

    // 1) Prefer exact Clerk identity match
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (existingUser) {
      // Keep mutable profile fields fresh without changing identity
      if (existingUser.email !== normalizedEmail || (existingUser.name || null) !== normalizedName) {
        const [updated] = await db
          .update(users)
          .set({
            email: normalizedEmail,
            name: normalizedName,
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updated;
      }

      return existingUser;
    }

    // 2) If same email exists from older session/provider, rebind it to this Clerk ID
    const existingByEmail = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingByEmail) {
      const [rebound] = await db
        .update(users)
        .set({
          clerkId,
          name: normalizedName,
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();

      return rebound;
    }

    // 3) Create new user
    const newUser = await db
      .insert(users)
      .values({
        clerkId,
        email: normalizedEmail,
        name: normalizedName,
        subscriptionTier: "free",
        streakCount: 0,
      })
      .returning();

    return newUser[0];
  } catch (error) {
    console.error("Error syncing user with NeonDB:", error);
    throw error;
  }
}
