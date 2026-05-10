"use client";

import * as React from "react";
import { Loader2, X, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const HORIZONS = [1, 3, 6, 12];

export default function SimulatePage() {
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState("");
  const [horizon, setHorizon] = React.useState(6);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [suggestedFromAudit, setSuggestedFromAudit] = React.useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  React.useEffect(() => {
    fetch("/api/dashboard/data", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.audit?.atsKeywordAnalysis?.skill_gaps) {
          setSuggestedFromAudit(j.data.audit.atsKeywordAnalysis.skill_gaps.slice(0, 8));
        }
      })
      .catch(() => {});
    fetch("/api/simulate/latest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setResult(j.data);
          setSkills(j.data.targetSkills || []);
          setHorizon(j.data.horizonMonths || 6);
        }
      })
      .catch(() => {});
  }, []);

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 8) return;
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const run = async () => {
    if (skills.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/simulate/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetSkills: skills, horizonMonths: horizon }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Career simulation is a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setResult(j.data);
      }
    } finally {
      setBusy(false);
    }
  };

  const chartData = result?.series ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Tools / Simulate"
        title="What if I learn these skills?"
        description="Estimates based on your audit history + Gemini lift estimates. Not a guarantee."
      />

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-neutral-500 mb-2">Skills to learn ({skills.length}/8)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
                {s}
                <button onClick={() => removeSkill(s)} className="hover:opacity-80"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill (e.g. kubernetes)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            />
            <Button variant="outline" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim() || skills.length >= 8}>Add</Button>
          </div>
          {suggestedFromAudit.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">From your skill gaps:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedFromAudit.filter((s) => !skills.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    disabled={skills.length >= 8}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >+ {s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-neutral-500 mb-2">Horizon</p>
          <div className="flex gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${horizon === h ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
              >{h} {h === 1 ? "month" : "months"}</button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={run} disabled={busy || skills.length === 0}>
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Run simulation
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-950">Projected curve</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#F5F5F5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} label={{ value: "Months from now", position: "insideBottom", offset: -5, fontSize: 10, fill: "#A3A3A3" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="readiness" name="Readiness" stroke="#0A0A0A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="marketMatch" name="Market match" stroke="#737373" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {result.suggestedSkills && result.suggestedSkills.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-950 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-neutral-700" />
                Fastest-impact alternatives
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {result.suggestedSkills.map((s: any) => (
                  <div key={s.skill} className="rounded-md border border-neutral-200 bg-white p-3">
                    <p className="text-sm font-semibold text-neutral-950">{s.skill}</p>
                    <p className="text-xs text-neutral-700 mt-1">+{s.readinessLift}% readiness · +{s.marketMatchLift}% market</p>
                    <p className="mt-2 text-[11px] italic text-neutral-500">{s.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </div>
  );
}
