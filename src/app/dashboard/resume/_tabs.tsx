"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/resume", label: "Audit", exact: true },
  { href: "/dashboard/resume/rewrite", label: "Rewrite" },
  { href: "/dashboard/resume/cover-letter", label: "Cover letter" },
  { href: "/dashboard/resume/gap-analyze", label: "Gap analyze" },
];

export function ResumeTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-neutral-200 mb-6">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
