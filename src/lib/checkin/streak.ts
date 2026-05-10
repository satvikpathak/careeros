import { db } from "@/db";
import { dailyCheckins, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export function todayUtcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function dateMinusDays(yyyymmdd: string, days: number): string {
  const d = new Date(yyyymmdd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function computeStreakDays(checkinDates: string[], today: string): number {
  const set = new Set(checkinDates);
  let streak = 0;
  let cursor = set.has(today) ? today : dateMinusDays(today, 1);
  if (!set.has(cursor)) return 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = dateMinusDays(cursor, 1);
  }
  return streak;
}

export interface CheckinResult {
  streakDays: number;
  checkedInToday: boolean;
}

export async function getStreak(userId: number, now: Date = new Date()): Promise<CheckinResult> {
  const today = todayUtcDate(now);
  const rows = await db.query.dailyCheckins.findMany({
    where: eq(dailyCheckins.userId, userId),
    orderBy: [desc(dailyCheckins.checkinDate)],
    limit: 365,
  });
  const dates = rows.map((r) => r.checkinDate);
  return {
    streakDays: computeStreakDays(dates, today),
    checkedInToday: dates.includes(today),
  };
}

export async function recordCheckin(
  userId: number,
  input: { summary?: string; applicationsSent?: number; hoursStudied?: number } = {},
  now: Date = new Date()
): Promise<CheckinResult> {
  const today = todayUtcDate(now);

  const existing = await db.query.dailyCheckins.findFirst({
    where: and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.checkinDate, today)),
  });

  if (!existing) {
    await db.insert(dailyCheckins).values({
      userId,
      checkinDate: today,
      summary: input.summary,
      applicationsSent: input.applicationsSent ?? 0,
      hoursStudied: input.hoursStudied !== undefined ? String(input.hoursStudied) : "0",
    });
  } else if (input.summary || input.applicationsSent !== undefined || input.hoursStudied !== undefined) {
    await db.update(dailyCheckins)
      .set({
        summary: input.summary ?? existing.summary,
        applicationsSent: input.applicationsSent ?? existing.applicationsSent,
        hoursStudied: input.hoursStudied !== undefined ? String(input.hoursStudied) : existing.hoursStudied,
      })
      .where(eq(dailyCheckins.id, existing.id));
  }

  const result = await getStreak(userId, now);
  await db.update(users).set({ streakCount: result.streakDays }).where(eq(users.id, userId));
  return result;
}
