export type PlanKey = "free" | "pro" | "team";
export type UsageKind = "audit" | "chat" | "roadmap" | "sprint_regen" | "rewriter" | "cover_letter";

export interface PlanQuotas {
  auditPerMonth: number;
  chatPerDay: number;
  applicationsTracked: number;
  rewriter: boolean;
  coverLetter: boolean;
}

export interface Plan {
  key: PlanKey;
  name: string;
  priceUsd: number;
  dodoProductId: string | null;
  features: string[];
  quotas: PlanQuotas;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    priceUsd: 0,
    dodoProductId: null,
    features: [
      "1 audit per month",
      "20 AI messages per day",
      "Track up to 3 applications",
    ],
    quotas: { auditPerMonth: 1, chatPerDay: 20, applicationsTracked: 3, rewriter: false, coverLetter: false },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceUsd: 19,
    dodoProductId: process.env.DODO_PRO_PRODUCT_ID || null,
    features: [
      "Unlimited audits",
      "Unlimited chat",
      "Unlimited applications",
      "Resume rewriter",
      "Cover letters",
    ],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
  team: {
    key: "team",
    name: "Team",
    priceUsd: 49,
    dodoProductId: process.env.DODO_TEAM_PRODUCT_ID || null,
    features: [
      "Everything in Pro",
      "Admin view (coming soon)",
      "Shared resources (coming soon)",
      "SSO (coming soon)",
    ],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
};

export function getQuota(plan: PlanKey, kind: UsageKind): number {
  const q = PLANS[plan].quotas;
  switch (kind) {
    case "audit": return q.auditPerMonth;
    case "chat": return q.chatPerDay;
    case "roadmap":
    case "sprint_regen":
      return plan === "free" ? 0 : Infinity;
    case "rewriter": return q.rewriter ? Infinity : 0;
    case "cover_letter": return q.coverLetter ? Infinity : 0;
  }
}
