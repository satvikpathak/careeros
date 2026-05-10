"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/components/ui/section-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KIND_LABELS: Record<string, { title: string; description: string }> = {
  welcome: { title: "Welcome email", description: "Sent once when you sign up." },
  audit_complete: { title: "Audit complete", description: "When your career audit finishes." },
  weekly_digest: { title: "Weekly digest", description: "Monday morning summary of your progress." },
  streak_at_risk: { title: "Streak at risk", description: "Reminder if you haven't checked in." },
};

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [subs, setSubs] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    fetch("/api/email/subscriptions", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setSubs(j.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (kind: string, enabled: boolean) => {
    const prev = subs[kind];
    setSubs((s) => ({ ...s, [kind]: enabled }));
    try {
      const res = await fetch("/api/email/subscriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, enabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSubs((s) => ({ ...s, [kind]: prev }));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Notifications" description="Choose which emails CareerOS sends you." />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-200">
            {Object.entries(KIND_LABELS).map(([kind, meta]) => (
              <li key={kind} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{meta.title}</p>
                  <p className="text-xs text-neutral-500">{meta.description}</p>
                </div>
                <Switch checked={subs[kind] ?? true} onCheckedChange={(v: boolean) => toggle(kind, v)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <p className="font-semibold text-neutral-950 mb-1">Plan & Billing</p>
        <p className="text-sm text-neutral-500 mb-4">Manage your subscription, view usage, change plans.</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/billing">View pricing</Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6 text-sm text-neutral-500">
        <p className="font-semibold text-neutral-950 mb-1">Profile</p>
        <p>Coming soon.</p>
      </Card>
    </div>
  );
}
