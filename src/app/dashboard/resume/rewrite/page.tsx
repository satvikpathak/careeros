"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function RewritePage() {
  const router = useRouter();
  const [jd, setJd] = React.useState<any>(null);
  const [sourceKind, setSourceKind] = React.useState<"pdf" | "latex">("pdf");
  const [tex, setTex] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const run = async () => {
    if (!jd) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/rewriter/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, sourceKind, tex: sourceKind === "latex" ? tex : undefined }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Resume rewriter is a Pro feature.");
        setUpgradeOpen(true);
      } else if (!j.success) {
        setErr(j.message || j.error);
      } else {
        router.push(`/dashboard/resume/rewrite/${j.data.versionId}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Rewrite" title="Tailor your resume to a JD" description="Pro: unlimited rewrites." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setSourceKind("pdf")} className={`text-xs font-semibold px-3 py-1 rounded-full ${sourceKind === "pdf" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}>PDF resume on file</button>
              <button onClick={() => setSourceKind("latex")} className={`text-xs font-semibold px-3 py-1 rounded-full ${sourceKind === "latex" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}>LaTeX paste</button>
            </div>
            {sourceKind === "latex" && (
              <Textarea rows={8} placeholder="Paste your .tex source here..." value={tex} onChange={(e) => setTex(e.target.value)} />
            )}
            {sourceKind === "pdf" && (
              <p className="text-xs text-neutral-500">We&apos;ll use bullets from your most recent audit.</p>
            )}
          </Card>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || (sourceKind === "latex" && tex.trim().length < 50)}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate rewrite
            </Button>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
