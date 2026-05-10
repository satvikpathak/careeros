"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { ResumeTabs } from "../../_tabs";
import { DiffViewer } from "@/components/rewriter/DiffViewer";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RewriteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [row, setRow] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/rewriter/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setRow(j.data); });
  }, [id]);

  const onChange = async (segments: any[]) => {
    setRow((r: any) => ({ ...r, diffSegments: segments }));
    setSaving(true);
    try {
      await fetch(`/api/rewriter/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diffSegments: segments }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!row) {
    return (
      <>
        <ResumeTabs />
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </>
    );
  }

  const isLatex = row.sourceKind === "latex";

  return (
    <>
      <ResumeTabs />
      <SectionHeader
        eyebrow="Rewrite"
        title={isLatex ? "LaTeX rewrite" : "Resume rewrite"}
        description={isLatex ? "Modified .tex ready to download." : "Per-bullet diff. Accept or reject."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/rewriter/${id}/download?format=${isLatex ? "tex" : "docx"}`}>
                <Download className="mr-1 h-3 w-3" /> Download {isLatex ? ".tex" : ".docx"}
              </a>
            </Button>
            {isLatex && row.modifiedTex && row.modifiedTex.length < 30000 && (
              <Button variant="outline" asChild>
                <a target="_blank" rel="noopener" href={`https://www.overleaf.com/docs?snip_uri=${encodeURIComponent("data:application/x-tex;base64," + btoa(row.modifiedTex))}`}>
                  Compile in Overleaf
                </a>
              </Button>
            )}
          </div>
        }
      />

      {row.error === "no_recognized_sections" && (
        <Card className="p-4 text-sm text-amber-700 border-amber-200 bg-amber-50">
          We couldn&apos;t detect Experience/Projects sections in your .tex — the file is unchanged. Check your section headings or paste the JD bullets manually.
        </Card>
      )}

      {saving && <p className="text-[10px] text-neutral-500 mb-2">Saving...</p>}

      <DiffViewer segments={row.diffSegments || []} onChange={onChange} />
    </>
  );
}
