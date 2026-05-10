"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { PlanCard } from "@/components/billing/PlanCard";

const PLAN_DEFS = [
  {
    key: "free",
    name: "Free",
    priceUsd: 0,
    features: ["1 audit per month", "20 AI messages per day", "Track up to 3 applications"],
  },
  {
    key: "pro",
    name: "Pro",
    priceUsd: 19,
    features: ["Unlimited audits", "Unlimited AI chat", "Unlimited applications", "Resume rewriter", "Cover letters"],
  },
  {
    key: "team",
    name: "Team",
    priceUsd: 49,
    features: ["Everything in Pro", "Admin view (coming soon)", "Shared resources (coming soon)", "SSO (coming soon)"],
  },
];

export default function BillingPage() {
  const [me, setMe] = React.useState<any>(null);
  const [usage, setUsage] = React.useState<any>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/billing/me", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/billing/usage", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([m, u]) => {
      if (m.success) setMe(m.data);
      if (u.success) setUsage(u.data);
    });
  }, []);

  const checkout = async (planKey: "pro" | "team") => {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey }),
    });
    const j = await res.json();
    if (j.success && j.data?.url) window.location.href = j.data.url;
    else alert(j.error || "Checkout unavailable");
  };

  const portal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const j = await res.json();
    if (j.success && j.data?.url) window.location.href = j.data.url;
    else alert(j.error || "Portal unavailable");
  };

  if (!me) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const planKey = me.planKey as "free" | "pro" | "team";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Billing"
        title="Plan & usage"
        description={planKey === "free"
          ? "Choose a plan to unlock the full toolkit."
          : `You're on ${planKey === "pro" ? "Pro" : "Team"}.${me.currentPeriodEnd ? ` Renews ${new Date(me.currentPeriodEnd).toLocaleDateString()}.` : ""}`}
        actions={planKey !== "free" ? <Button variant="outline" onClick={portal}>Manage billing</Button> : undefined}
      />

      {usage && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-950 mb-3">Usage this period</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageRow label="Audits" used={usage.audit.used} limit={usage.audit.limit} />
            <UsageRow label="AI messages today" used={usage.chat.used} limit={usage.chat.limit} />
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_DEFS.map((p) => (
          <PlanCard
            key={p.key}
            name={p.name}
            priceUsd={p.priceUsd}
            features={p.features}
            isCurrent={planKey === p.key}
            highlighted={p.key === "pro"}
            ctaLabel={p.key === "free" ? "Free forever" : `Choose ${p.name}`}
            ctaDisabled={p.key === "free"}
            onCta={p.key === "free" ? undefined : () => checkout(p.key as "pro" | "team")}
          />
        ))}
      </div>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const limitText = limit === Infinity ? "∞" : limit;
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>{label}</span>
        <span><span className="font-semibold text-neutral-950">{used}</span> / {limitText}</span>
      </div>
      {limit !== Infinity && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
          <div className="h-full bg-neutral-950" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
