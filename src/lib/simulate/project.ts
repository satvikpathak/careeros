export interface SkillLift {
  skill: string;
  readinessLift: number;
  marketMatchLift: number;
}

export interface ProjectionPoint {
  month: number;
  readiness: number;
  marketMatch: number;
}

export interface ProjectInput {
  baselineLatest: { readiness: number; marketMatch: number };
  baselineSlope: { readiness: number; marketMatch: number };
  lifts: SkillLift[];
  horizonMonths: number;
}

function liftFraction(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const k = 6;
  const mid = 0.6;
  const raw = 1 / (1 + Math.exp(-k * (t - mid)));
  const f0 = 1 / (1 + Math.exp(-k * (0 - mid)));
  const f1 = 1 / (1 + Math.exp(-k * (1 - mid)));
  return (raw - f0) / (f1 - f0);
}

export function project(input: ProjectInput): ProjectionPoint[] {
  const totalReadinessLift = input.lifts.reduce((s, l) => s + (l.readinessLift || 0), 0);
  const totalMarketLift = input.lifts.reduce((s, l) => s + (l.marketMatchLift || 0), 0);

  const points: ProjectionPoint[] = [];
  for (let m = 0; m <= input.horizonMonths; m++) {
    const t = input.horizonMonths === 0 ? 1 : m / input.horizonMonths;
    const f = liftFraction(t);

    const baseReadiness = input.baselineLatest.readiness + input.baselineSlope.readiness * m;
    const baseMarket = input.baselineLatest.marketMatch + input.baselineSlope.marketMatch * m;

    const readiness = Math.min(100, baseReadiness + totalReadinessLift * f);
    const marketMatch = Math.min(100, baseMarket + totalMarketLift * f);

    points.push({
      month: m,
      readiness: Math.round(readiness * 10) / 10,
      marketMatch: Math.round(marketMatch * 10) / 10,
    });
  }
  return points;
}

export function computeSlope(history: { date: string; readiness: number; marketMatch: number }[]): { readiness: number; marketMatch: number } {
  if (history.length < 2) return { readiness: 0, marketMatch: 0 };
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const monthsSpan = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (30 * 24 * 60 * 60 * 1000));
  return {
    readiness: (last.readiness - first.readiness) / monthsSpan,
    marketMatch: (last.marketMatch - first.marketMatch) / monthsSpan,
  };
}
