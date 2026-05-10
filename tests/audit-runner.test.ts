import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { auditJobs: { findFirst: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 99 }])) })) })),
  },
}));

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: vi.fn(() => Promise.resolve(JSON.stringify({
    inferred_current_role: "Software Engineer",
    inferred_profession_domain: "Software",
    target_role_used: "Senior Engineer",
    readiness_score: 80,
    market_match_score: 75,
    project_quality_score: 70,
    skill_map: { typescript: 90 },
    skill_gaps: ["k8s"],
  }))),
  parseResumeStructured: vi.fn(() => Promise.resolve("{}")),
  generateEmbedding: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
}));

vi.mock("pdf-parse-fork", () => ({
  default: vi.fn(() => Promise.resolve({ text: "RESUME CONTENT" })),
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: vi.fn(() => Promise.resolve(Buffer.from("pdf bytes"))) },
}));

import { runAuditJob } from "@/lib/audit/runner";
import { db } from "@/db";

describe("runAuditJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.auditJobs.findFirst as any).mockResolvedValue({
      id: 1,
      userId: 7,
      status: "queued",
      s3Url: "local:///tmp/test.pdf",
      fileName: "test.pdf",
      targetRole: "Senior Engineer",
      githubUrl: null,
    });
  });

  it("transitions queued → running → done and writes audit", async () => {
    await runAuditJob(1);
    const updateCalls = (db.update as any).mock.calls.length;
    expect(updateCalls).toBeGreaterThanOrEqual(2); // running, then done
    expect((db.insert as any)).toHaveBeenCalled();
  });
});
