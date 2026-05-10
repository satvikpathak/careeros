"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HistoryDrawerProps {
  open: boolean;
  audit: any | null;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDrawer({ open, audit, onOpenChange }: HistoryDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit details</DialogTitle>
        </DialogHeader>
        {audit && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Readiness" value={`${audit.readinessScore}%`} />
              <Stat label="Market Match" value={`${audit.marketMatchScore}%`} />
              <Stat label="Project Quality" value={`${audit.projectQualityScore}%`} />
            </div>
            <pre className="max-h-96 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs">
              {JSON.stringify(audit, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
