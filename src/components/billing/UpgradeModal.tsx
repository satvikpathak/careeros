"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  recommendedPlan?: "pro" | "team";
}

export function UpgradeModal({ open, onOpenChange, reason, recommendedPlan = "pro" }: UpgradeModalProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const upgrade = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planKey: recommendedPlan }),
      });
      const j = await res.json();
      if (j.success && j.data?.url) {
        window.location.href = j.data.url;
      } else {
        alert(j.error || "Checkout unavailable. Try again later.");
        setSubmitting(false);
      }
    } catch {
      alert("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neutral-700" />
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">{reason}</p>
          <ul className="space-y-1 text-sm text-neutral-700">
            <li>• Unlimited audits</li>
            <li>• Unlimited AI chat</li>
            <li>• Resume rewriter</li>
            <li>• Cover letters</li>
          </ul>
          <p className="text-2xl font-semibold text-neutral-950">$19<span className="text-sm font-normal text-neutral-500">/mo</span></p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
            <Button onClick={upgrade} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
