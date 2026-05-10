"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; label?: string };
  icon?: React.ElementType;
  className?: string;
}

export function StatCard({ label, value, delta, icon: Icon, className }: StatCardProps) {
  const isPositive = delta ? delta.value >= 0 : true;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
            <Icon className="h-4 w-4 text-neutral-700" />
          </div>
        )}
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              isPositive
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}
            {delta.value}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">{value}</p>
      {delta?.label && <p className="mt-1 text-[11px] text-neutral-500">{delta.label}</p>}
    </motion.div>
  );
}
