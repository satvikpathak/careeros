"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface JdInputProps {
  onParsed: (jd: { id: number; parsed: any; rawText: string }) => void;
}

export function JdInput({ onParsed }: JdInputProps) {
  const [mode, setMode] = React.useState<"url" | "paste">("url");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/jd/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url } : { text }),
      });
      const j = await res.json();
      if (!j.success) {
        setErr(j.message || j.error || "Failed to parse JD");
        if (j.error === "host_blocked") setMode("paste");
      } else {
        onParsed(j.data);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode("url")}
          className={`text-xs font-semibold px-3 py-1 rounded-full ${mode === "url" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
        >URL</button>
        <button
          onClick={() => setMode("paste")}
          className={`text-xs font-semibold px-3 py-1 rounded-full ${mode === "paste" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
        >Paste text</button>
      </div>

      {mode === "url" ? (
        <Input
          placeholder="https://boards.greenhouse.io/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      ) : (
        <Textarea
          rows={8}
          placeholder="Paste the full job description here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={busy || (mode === "url" ? !url.trim() : text.trim().length < 50)}>
          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </Card>
  );
}
