"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  priceUsd: number;
  features: string[];
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
  highlighted?: boolean;
  onCta?: () => void | Promise<void>;
}

export function PlanCard({ name, priceUsd, features, isCurrent, ctaLabel, ctaDisabled, highlighted, onCta }: PlanCardProps) {
  const [busy, setBusy] = React.useState(false);

  const click = async () => {
    if (!onCta) return;
    setBusy(true);
    try { await onCta(); } finally { setBusy(false); }
  };

  return (
    <Card className={cn("p-6 relative", highlighted && "border-neutral-950")}>
      {highlighted && (
        <span className="absolute -top-2 left-6 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Recommended</span>
      )}
      <h3 className="text-lg font-semibold text-neutral-950">{name}</h3>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
        ${priceUsd}<span className="text-sm font-normal text-neutral-500">/mo</span>
      </p>
      <ul className="mt-5 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-950" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">Current plan</Button>
        ) : (
          <Button onClick={click} disabled={busy || ctaDisabled} className="w-full">
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            {ctaLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
