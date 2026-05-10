"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stage = "parsing" | "ai" | "embed" | "saving";
type JobStatus = "queued" | "running" | "done" | "failed";

interface AuditProgressProps {
  jobId: number;
  onComplete?: (auditId: number) => void;
  onError?: (err: string) => void;
  className?: string;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: "parsing", label: "Parsing resume" },
  { key: "ai", label: "AI analysis" },
  { key: "embed", label: "Generating embedding" },
  { key: "saving", label: "Saving audit" },
];

const POLL_BASE_MS = 1500;
const POLL_MAX_MS = 6000;
const TIMEOUT_MS = 5 * 60 * 1000;

export function AuditProgress({ jobId, onComplete, onError, className }: AuditProgressProps) {
  const [status, setStatus] = React.useState<JobStatus>("queued");
  const [progress, setProgress] = React.useState<{ stage?: Stage; pct?: number }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/audit/${jobId}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Status check failed");
        attempt = 0;
        setStatus(json.data.status);
        setProgress(json.data.progress || {});
        setError(json.data.error);
        if (json.data.status === "done") {
          onComplete?.(json.data.auditId);
          return;
        }
        if (json.data.status === "failed") {
          onError?.(json.data.error || "Audit failed");
          return;
        }
      } catch {
        attempt = Math.min(attempt + 1, 3);
      }
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setError("Audit took too long. Try refreshing.");
        return;
      }
      const delay = Math.min(POLL_BASE_MS * Math.pow(2, attempt), POLL_MAX_MS);
      setTimeout(tick, delay);
    };
    tick();
    return () => { cancelled = true; };
  }, [jobId, onComplete, onError]);

  const retry = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/audit/${jobId}/retry`, { method: "POST" });
      setStatus("queued");
      setError(null);
      setProgress({});
    } finally {
      setRetrying(false);
    }
  };

  const currentIdx = STAGES.findIndex((s) => s.key === progress.stage);
  const overallPct = progress.pct ?? (status === "queued" ? 2 : 0);

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "failed" ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
          )}
          <p className="text-sm font-semibold text-neutral-950">
            {status === "failed" ? "Audit failed" : status === "done" ? "Audit complete" : "Generating your audit"}
          </p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{overallPct}%</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className={cn("h-full rounded-full", status === "failed" ? "bg-red-500" : "bg-neutral-950")}
          initial={{ width: 0 }}
          animate={{ width: `${overallPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <ul className="space-y-2">
        {STAGES.map((s, i) => {
          const done = currentIdx > i || status === "done";
          const active = currentIdx === i && status === "running";
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-700" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
              )}
              <span className={cn(done ? "text-neutral-500" : active ? "text-neutral-950 font-medium" : "text-neutral-400")}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
          {status === "failed" && (
            <Button onClick={retry} disabled={retrying} size="sm" variant="outline" className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
