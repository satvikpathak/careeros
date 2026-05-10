"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryDrawer } from "@/components/audit/HistoryDrawer";

export default function HistoryPage() {
  const [loading, setLoading] = React.useState(true);
  const [audits, setAudits] = React.useState<any[]>([]);
  const [trend, setTrend] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<any | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setAudits(j.data.audits);
          setTrend(j.data.trend);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <EmptyState
        title="No audits yet"
        description="Once you upload a resume your audit history will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="History" title="Audit timeline" description={`${audits.length} audit${audits.length === 1 ? "" : "s"} on file`} />

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-neutral-950">Readiness over time</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="#F5F5F5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="readiness" stroke="#0A0A0A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="marketMatch" stroke="#737373" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <ul className="divide-y divide-neutral-200">
          {audits.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => { setSelected(a); setOpen(true); }}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {a.atsKeywordAnalysis?.target_role_used || "General Professional"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-neutral-700"><span className="font-semibold text-neutral-950">{a.readinessScore}%</span> readiness</span>
                  <span className="text-neutral-700"><span className="font-semibold text-neutral-950">{a.marketMatchScore}%</span> market</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <HistoryDrawer open={open} audit={selected} onOpenChange={setOpen} />
    </div>
  );
}
