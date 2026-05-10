import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  parseResumeWithGemini: vi.fn(),
  findFirstAudit: vi.fn(),
  insertReturning: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: mocks.parseResumeWithGemini,
}));

vi.mock("@/db", () => ({
  db: {
    query: { careerAudits: { findFirst: mocks.findFirstAudit } },
    insert: () => ({ values: () => ({ returning: mocks.insertReturning }) }),
  },
}));

import { runOutreach } from "@/lib/outreach/run";

describe("runOutreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstAudit.mockResolvedValue({
      readinessScore: 80,
      skillMap: { typescript: 90 },
      atsKeywordAnalysis: { target_role_used: "Senior SWE", inferred_current_role: "SWE" },
    });
    mocks.insertReturning.mockResolvedValue([{ id: 7, emailSubject: "S", emailBody: "B", dmBody: "D" }]);
    mocks.parseResumeWithGemini.mockResolvedValue(JSON.stringify({
      emailSubject: "Quick note about the Senior SWE role",
      emailBody: "Body",
      dmBody: "DM",
    }));
  });

  it("returns drafts on Gemini valid JSON", async () => {
    const r = await runOutreach({ userId: 1, jdId: 2, jdText: "JD body" });
    expect(r.id).toBe(7);
    expect(mocks.parseResumeWithGemini).toHaveBeenCalled();
  });

  it("throws no_audit_on_file when audit missing", async () => {
    mocks.findFirstAudit.mockResolvedValue(null);
    await expect(runOutreach({ userId: 1, jdId: 2, jdText: "JD" })).rejects.toThrow("no_audit_on_file");
  });

  it("falls back to safe template on bad JSON", async () => {
    mocks.parseResumeWithGemini.mockResolvedValue("not valid json");
    mocks.insertReturning.mockResolvedValue([{ id: 9, emailSubject: "Re: opportunity", emailBody: "Body", dmBody: "DM" }]);
    const r = await runOutreach({ userId: 1, jdId: 2, jdText: "JD" });
    expect(r.id).toBe(9);
  });
});
