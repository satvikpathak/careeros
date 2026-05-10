import { db } from "@/db";
import { careerAudits } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export interface AuditTrendPoint {
  date: string;
  readiness: number;
  marketMatch: number;
}

export async function getAuditTrend(userId: number): Promise<AuditTrendPoint[]> {
  const rows = await db.query.careerAudits.findMany({
    where: eq(careerAudits.userId, userId),
    orderBy: [asc(careerAudits.createdAt)],
    limit: 24,
  });
  return rows.map((r) => ({
    date: (r.createdAt ?? new Date()).toISOString(),
    readiness: r.readinessScore ?? 0,
    marketMatch: r.marketMatchScore ?? 0,
  }));
}
