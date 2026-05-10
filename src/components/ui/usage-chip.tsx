"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UsageChipProps {
  planLabel?: string;
  href?: string;
  className?: string;
}

export function UsageChip({ planLabel = "Free", href = "/dashboard", className }: UsageChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {planLabel} plan
    </Link>
  );
}
