import { describe, it, expect } from "vitest";
import { jds, resumeVersions, coverLetters, gapReports } from "@/db/schema";

describe("phase 4A schema", () => {
  it("jds has required columns", () => {
    const cols = Object.keys(jds);
    for (const c of ["id", "userId", "sourceUrl", "contentHash", "rawText", "parsed", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("resumeVersions has required columns", () => {
    const cols = Object.keys(resumeVersions);
    for (const c of ["id", "userId", "jdId", "sourceKind", "originalTex", "modifiedTex", "rewrittenBullets", "diffSegments", "status", "error", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("coverLetters has required columns", () => {
    const cols = Object.keys(coverLetters);
    for (const c of ["id", "userId", "jdId", "tone", "body", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("gapReports has required columns", () => {
    const cols = Object.keys(gapReports);
    for (const c of ["id", "userId", "jdId", "coverage", "suggestions", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });
});
