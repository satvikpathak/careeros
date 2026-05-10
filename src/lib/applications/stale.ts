export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

const STALE_DAYS: Partial<Record<ApplicationStatus, number>> = {
  saved: 7,
  applied: 10,
  screening: 5,
  interview: 3,
};

export function isStale(status: ApplicationStatus, updatedAt: Date, now: Date = new Date()): boolean {
  const threshold = STALE_DAYS[status];
  if (threshold === undefined) return false;
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs >= threshold * 24 * 60 * 60 * 1000;
}
