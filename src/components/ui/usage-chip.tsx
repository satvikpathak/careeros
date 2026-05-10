"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

interface UsageChipProps {
  className?: string;
}

export function UsageChip({ className }: UsageChipProps) {
  const [planKey, setPlanKey] = React.useState<string>("free");

  React.useEffect(() => {
    fetch("/api/billing/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setPlanKey(j.data.planKey); })
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/dashboard/billing"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {LABELS[planKey] ?? "Free"} plan
    </Link>
  );
}
