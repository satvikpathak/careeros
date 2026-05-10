"use client";

import * as React from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function OutreachPage() {
  const [jd, setJd] = React.useState<any>(null);
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientTitle, setRecipientTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<any>(null);
  const [emailBody, setEmailBody] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [dmBody, setDmBody] = React.useState("");
  const [copied, setCopied] = React.useState<"email" | "dm" | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const generate = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/outreach/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jdId: jd.id,
          recipientName: recipientName.trim() || undefined,
          recipientTitle: recipientTitle.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Outreach drafts are a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setDraft(j.data);
        setEmailSubject(j.data.emailSubject);
        setEmailBody(j.data.emailBody);
        setDmBody(j.data.dmBody);
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async (which: "email" | "dm") => {
    const text = which === "email" ? `Subject: ${emailSubject}\n\n${emailBody}` : dmBody;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Tools / Outreach" title="Cold email + LinkedIn DM" description="Pro feature. Copy-only — we never send on your behalf." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !draft ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <Card className="p-5 space-y-3">
            <p className="text-xs font-semibold text-neutral-500">Recipient (optional)</p>
            <Input placeholder="Name (optional)" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            <Input placeholder="Title (optional, e.g. Engineering Manager)" value={recipientTitle} onChange={(e) => setRecipientTitle(e.target.value)} />
          </Card>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">Cold email</h3>
              <Button variant="outline" size="sm" onClick={() => copy("email")}>
                {copied === "email" ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                {copied === "email" ? "Copied" : "Copy"}
              </Button>
            </div>
            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            <Textarea rows={10} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
          </Card>
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">LinkedIn DM</h3>
              <Button variant="outline" size="sm" onClick={() => copy("dm")}>
                {copied === "dm" ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                {copied === "dm" ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea rows={6} value={dmBody} onChange={(e) => setDmBody(e.target.value)} />
            <p className={`text-[10px] ${dmBody.length > 300 ? "text-red-600" : "text-neutral-500"}`}>{dmBody.length}/300 characters</p>
          </Card>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </div>
  );
}
