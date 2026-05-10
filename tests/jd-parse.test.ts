import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: vi.fn(),
}));

import { parseJd } from "@/lib/jd/parse";

describe("parseJd", () => {
  it("returns parsed JD object on valid Gemini JSON", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue(JSON.stringify({
      title: "Senior SWE",
      company: "Acme",
      location: "Remote",
      requirements: ["5+ years"],
      keywords: ["typescript", "react"],
      niceToHaves: ["kubernetes"],
    }));
    const r = await parseJd("Some JD text");
    expect(r.title).toBe("Senior SWE");
    expect(r.keywords).toEqual(["typescript", "react"]);
  });

  it("falls back to safe shape on invalid JSON", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue("not json at all");
    const r = await parseJd("text");
    expect(r.title).toBe("");
    expect(Array.isArray(r.keywords)).toBe(true);
  });

  it("strips markdown fences", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue('```json\n{"title":"X","company":"Y","location":null,"requirements":[],"keywords":[],"niceToHaves":[]}\n```');
    const r = await parseJd("t");
    expect(r.title).toBe("X");
  });
});
