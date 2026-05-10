"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { AuditProgress } from "@/components/audit/AuditProgress";

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Data Analyst",
  "Product Manager",
  "Designer",
  "Marketing Manager",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [targetRole, setTargetRole] = React.useState("");
  const [jobId, setJobId] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);

  const submit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetRole", targetRole);
      const res = await fetch("/api/audit/start", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) setJobId(json.data.jobId);
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async () => {
    setCompleting(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/dashboard");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader
        eyebrow={`Step ${step} of 3`}
        title="Welcome to CareerOS"
        description="Three quick steps and we'll have your career intelligence audit ready."
      />

      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-neutral-950" : "bg-neutral-200"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Upload your resume</h3>
              <p className="mt-1 text-sm text-neutral-500">PDF only. We&apos;ll start parsing as soon as you select it.</p>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center transition hover:bg-neutral-100">
                <Upload className="h-6 w-6 text-neutral-400" />
                <span className="mt-3 text-sm font-medium text-neutral-700">
                  {file ? file.name : "Drop or click to choose a PDF"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="mt-6 flex justify-end">
                <Button disabled={!file} onClick={() => setStep(2)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Target role</h3>
              <p className="mt-1 text-sm text-neutral-500">Optional &mdash; helps tailor the audit. Pick a suggestion or type your own.</p>

              <Input
                className="mt-6"
                placeholder="e.g. Senior Software Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={async () => {
                    await submit();
                    setStep(3);
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Starting..." : "Start audit"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Generating your audit</h3>
              <p className="mt-1 text-sm text-neutral-500">You can close this page &mdash; it&apos;ll finish in the background. Or wait and we&apos;ll take you straight to the dashboard.</p>

              {jobId && (
                <div className="mt-6">
                  <AuditProgress
                    jobId={jobId}
                    onComplete={finish}
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={finish} disabled={completing}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Go to dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
