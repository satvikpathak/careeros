"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function GapAnalyzePage() {
  const [jd, setJd] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<any>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const run = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/gap-analyze/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason(`You've used all ${j.data.limit} ${j.data.kind === "audit" ? "audits" : "rewriter calls"} this month.`);
        setUpgradeOpen(true);
      } else if (j.success) {
        setReport(j.data);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Gap analyze" title="Coverage vs. JD" description="Free: 3 suggestions. Pro: full report." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !report ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Run analysis
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">Keyword coverage</h3>
              <span className="text-2xl font-semibold text-neutral-950 tabular-nums">{report.coverage.score}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-neutral-950" style={{ width: `${report.coverage.score}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className="font-semibold text-neutral-700 mb-1">Matched ({report.coverage.matched.length})</p>
                <p className="text-neutral-600">{report.coverage.matched.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-700 mb-1">Missing ({report.coverage.missing.length})</p>
                <p className="text-neutral-600">{report.coverage.missing.join(", ") || "—"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">Suggested edits</h3>
            <ul className="space-y-3">
              {report.suggestions.map((s: any, i: number) => (
                <li key={i} className="rounded-md border border-neutral-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{s.section}</p>
                  {s.original && <p className="mt-1 text-xs text-neutral-500 line-through">{s.original}</p>}
                  <p className="mt-1 text-sm text-neutral-950">{s.suggested}</p>
                  <p className="mt-1 text-[10px] italic text-neutral-500">{s.rationale}</p>
                </li>
              ))}
            </ul>

            {report.truncated && (
              <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Showing 3 of {report.suggestions.length}+ suggestions. <button onClick={() => { setUpgradeReason("Unlock the full gap report"); setUpgradeOpen(true); }} className="font-semibold underline">Upgrade to Pro</button> for the rest.
              </div>
            )}
          </Card>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
