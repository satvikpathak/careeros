"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
  section: string;
  index: number;
  original: string;
  suggested: string;
  accepted: boolean | null;
  rationale?: string;
}

interface DiffViewerProps {
  segments: Segment[];
  onChange: (segments: Segment[]) => void;
}

export function DiffViewer({ segments, onChange }: DiffViewerProps) {
  const setAccepted = (idx: number, accepted: boolean | null) => {
    const next = segments.slice();
    next[idx] = { ...next[idx], accepted };
    onChange(next);
  };

  const grouped = segments.reduce((acc, s, i) => {
    const arr = acc.get(s.section) ?? [];
    arr.push({ s, i });
    acc.set(s.section, arr);
    return acc;
  }, new Map<string, { s: Segment; i: number }[]>());

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([section, items]) => (
        <div key={section}>
          <h3 className="mb-3 text-sm font-semibold text-neutral-950">{section}</h3>
          <ul className="space-y-3">
            {items.map(({ s, i }) => (
              <li key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-500">Original</span>
                    <p className="mt-1 text-neutral-700">{s.original}</p>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-500">Suggested</span>
                    <p className={cn("mt-1", s.accepted === false ? "line-through text-neutral-400" : "text-neutral-950 font-medium")}>{s.suggested}</p>
                  </div>
                </div>
                {s.rationale && <p className="mt-2 text-[10px] text-neutral-500 italic">{s.rationale}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setAccepted(i, s.accepted === true ? null : true)}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border", s.accepted === true ? "bg-neutral-950 text-white border-neutral-950" : "bg-white text-neutral-700 border-neutral-200")}
                  >
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button
                    onClick={() => setAccepted(i, s.accepted === false ? null : false)}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border", s.accepted === false ? "bg-red-600 text-white border-red-600" : "bg-white text-neutral-700 border-neutral-200")}
                  >
                    <X className="h-3 w-3" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
