import { describe, it, expect } from "vitest";
import { auditJobs, users } from "@/db/schema";

describe("phase 2A schema", () => {
  it("auditJobs table exists with required columns", () => {
    const cols = Object.keys(auditJobs);
    for (const c of ["id", "userId", "status", "progress", "s3Url", "fileName", "targetRole", "githubUrl", "error", "auditId", "createdAt", "startedAt", "finishedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("users has onboardedAt column", () => {
    expect(Object.keys(users)).toContain("onboardedAt");
  });
});
