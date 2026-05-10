"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveToTrackerButtonProps {
  job: {
    title: string;
    company: string;
    location?: string;
    url?: string;
    description?: string;
  };
}

export function SaveToTrackerButton({ job }: SaveToTrackerButtonProps) {
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          sourceUrl: job.url,
          jobSnapshot: job,
        }),
      });
      const j = await res.json();
      setState(j.success ? "saved" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "saved") {
    return (
      <Button size="sm" variant="outline" disabled>
        <BookmarkCheck className="mr-1 h-3 w-3" /> Saved
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={save} disabled={state === "saving"}>
      {state === "saving" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Bookmark className="mr-1 h-3 w-3" />}
      Save
    </Button>
  );
}
