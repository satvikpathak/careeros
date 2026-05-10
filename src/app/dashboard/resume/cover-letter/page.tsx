"use client";

import * as React from "react";
import { Loader2, Download } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const TONES = [
  { value: "formal", label: "Formal" },
  { value: "conversational", label: "Conversational" },
  { value: "concise", label: "Concise" },
];

export default function CoverLetterPage() {
  const [jd, setJd] = React.useState<any>(null);
  const [tone, setTone] = React.useState("conversational");
  const [busy, setBusy] = React.useState(false);
  const [letter, setLetter] = React.useState<{ id: number; body: string } | null>(null);
  const [draftBody, setDraftBody] = React.useState("");
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const generate = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cover-letter/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, tone }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Cover letter generator is a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setLetter({ id: j.data.id, body: j.data.body });
        setDraftBody(j.data.body);
      }
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!letter) return;
    await fetch(`/api/cover-letter/${letter.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draftBody }),
    });
    setSavedAt(Date.now());
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Cover letter" title="Generate a tailored cover letter" description="Pro feature." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !letter ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold text-neutral-500 mb-2">Tone</p>
            <div className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${tone === t.value ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
                >{t.label}</button>
              ))}
            </div>
          </Card>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea rows={18} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-500">{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Edits not saved"}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={save}>Save</Button>
              <Button asChild>
                <a href={`/api/cover-letter/${letter.id}/download`}>
                  <Download className="mr-1 h-3 w-3" /> Download .docx
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
