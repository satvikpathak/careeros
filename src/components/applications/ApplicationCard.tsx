"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationCardProps {
  app: {
    id: number;
    jobTitle: string;
    company: string;
    location?: string | null;
    sourceUrl?: string | null;
    updatedAt?: Date | string | null;
  };
}

export function ApplicationCard({ app }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [ageDays, setAgeDays] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!app.updatedAt) { setAgeDays(null); return; }
    const updated = new Date(app.updatedAt);
    setAgeDays(Math.floor((Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000)));
  }, [app.updatedAt]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-300"
      )}
    >
      <p className="text-sm font-semibold text-neutral-950 line-clamp-2">{app.jobTitle}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-neutral-600">
        <Building2 className="h-3 w-3" />
        <span className="truncate">{app.company}</span>
      </div>
      {app.location && (
        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{app.location}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-400">
        <span>{ageDays !== null ? `${ageDays}d ago` : "—"}</span>
        {app.sourceUrl && (
          <a
            href={app.sourceUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 hover:text-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
