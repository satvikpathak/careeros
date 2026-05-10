"use client";

import * as React from "react";
import { Flame, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface State {
  streakDays: number;
  checkedInToday: boolean;
}

export function CheckinWidget() {
  const [state, setState] = React.useState<State | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [appsSent, setAppsSent] = React.useState("");
  const [hours, setHours] = React.useState("");

  React.useEffect(() => {
    fetch("/api/checkin", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setState(j.data); });
  }, []);

  const checkIn = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, number> = {};
      if (appsSent.trim()) body.applicationsSent = Number(appsSent);
      if (hours.trim()) body.hoursStudied = Number(hours);
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.success) setState(j.data);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === null) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Flame className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Streak</p>
            <p className="text-2xl font-semibold text-neutral-950 tabular-nums">{state.streakDays} {state.streakDays === 1 ? "day" : "days"}</p>
          </div>
        </div>
        {state.checkedInToday ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <Check className="h-3 w-3" /> Checked in today
          </span>
        ) : (
          <Button onClick={checkIn} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Check in
          </Button>
        )}
      </div>

      {!state.checkedInToday && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-500">Apps sent today</label>
            <Input value={appsSent} onChange={(e) => setAppsSent(e.target.value)} placeholder="0" type="number" min={0} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-neutral-500">Hours studied</label>
            <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" type="number" min={0} step={0.5} />
          </div>
        </div>
      )}
    </Card>
  );
}
