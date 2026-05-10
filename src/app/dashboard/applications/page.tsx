"use client";

import * as React from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { KanbanColumn } from "@/components/applications/KanbanColumn";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

const COLUMNS: { id: string; title: string }[] = [
  { id: "saved", title: "Saved" },
  { id: "applied", title: "Applied" },
  { id: "screening", title: "Screening" },
  { id: "interview", title: "Interview" },
];

const TERMINAL = ["offer", "rejected", "withdrawn"] as const;

export default function ApplicationsPage() {
  const [loading, setLoading] = React.useState(true);
  const [apps, setApps] = React.useState<any[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  React.useEffect(() => {
    fetch("/api/applications", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setApps(j.data); })
      .finally(() => setLoading(false));
  }, []);

  const grouped = React.useMemo(() => {
    const out: Record<string, any[]> = { saved: [], applied: [], screening: [], interview: [] };
    const closed: any[] = [];
    for (const a of apps) {
      if ((TERMINAL as readonly string[]).includes(a.status)) closed.push(a);
      else (out[a.status] ?? out.saved).push(a);
    }
    return { active: out, closed };
  }, [apps]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const appId = Number(active.id);
    const newStatus = String(over.id);
    const current = apps.find((a) => a.id === appId);
    if (!current || current.status === newStatus) return;

    setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: current.status } : a));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Save jobs from the Jobs page to start tracking them here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Applications" description={`${apps.length} on file`} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <KanbanColumn key={c.id} id={c.id} title={c.title} apps={grouped.active[c.id] || []} />
          ))}
        </div>
      </DndContext>

      {grouped.closed.length > 0 && (
        <details className="rounded-xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-700">Closed ({grouped.closed.length})</summary>
          <ul className="mt-3 divide-y divide-neutral-200">
            {grouped.closed.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-medium text-neutral-950">{a.jobTitle}</span>
                <span className="ml-2 text-neutral-500">— {a.company} · {a.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
