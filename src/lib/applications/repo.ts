import { db } from "@/db";
import { applications } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import type { ApplicationStatus } from "./stale";
import { isStale } from "./stale";

export type { ApplicationStatus };

export async function listApplications(userId: number) {
  return db.query.applications.findMany({
    where: eq(applications.userId, userId),
    orderBy: [desc(applications.updatedAt)],
  });
}

export async function createApplication(
  userId: number,
  input: { jobTitle: string; company: string; location?: string; sourceUrl?: string; jobSnapshot?: any }
) {
  const [row] = await db.insert(applications).values({
    userId,
    jobTitle: input.jobTitle,
    company: input.company,
    location: input.location,
    sourceUrl: input.sourceUrl,
    jobSnapshot: input.jobSnapshot,
    status: "saved",
  }).returning();
  return row;
}

export async function updateApplication(
  userId: number,
  id: number,
  patch: Partial<{ status: ApplicationStatus; notes: string; nextActionAt: Date | null }>
) {
  const next: any = { ...patch, updatedAt: new Date() };
  if (patch.status === "applied") next.appliedAt = new Date();

  const [row] = await db.update(applications)
    .set(next)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  return row;
}

export async function deleteApplication(userId: number, id: number) {
  await db.delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
}

export async function listStaleApplications(userId: number) {
  const all = await listApplications(userId);
  const now = new Date();
  return all.filter((a) => isStale(a.status as ApplicationStatus, a.updatedAt ?? a.createdAt ?? now, now));
}
