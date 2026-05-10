"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function NeedsAttentionWidget() {
  const [items, setItems] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    fetch("/api/applications/stale", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(j.success ? j.data : []));
  }, []);

  if (items === null) return null;
  if (items.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-neutral-950">Needs attention</h3>
        <p className="mt-1 text-xs text-neutral-500">Nothing&apos;s stuck. Nice.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-neutral-950">Needs attention</h3>
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="text-xs">
            <Link href="/dashboard/applications" className="block rounded-md p-2 hover:bg-neutral-50">
              <p className="font-medium text-neutral-950 truncate">{a.jobTitle}</p>
              <p className="text-neutral-500 truncate">{a.company} · {a.status}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/dashboard/applications" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950">
        View all <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}
