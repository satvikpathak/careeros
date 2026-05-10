"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ApplicationCard } from "./ApplicationCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  apps: any[];
}

export function KanbanColumn({ id, title, apps }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors",
        isOver && "bg-neutral-100"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
        <span className="rounded-full bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{apps.length}</span>
      </div>
      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[60px]">
          {apps.map((a) => <ApplicationCard key={a.id} app={a} />)}
        </div>
      </SortableContext>
    </div>
  );
}
