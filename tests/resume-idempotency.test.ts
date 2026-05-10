import { describe, it, expect } from "vitest";
import { auditFingerprint } from "@/lib/audit-fingerprint";

describe("auditFingerprint", () => {
  it("is deterministic for the same inputs", () => {
    const a = auditFingerprint("user-1", "resume text", "Software Engineer");
    const b = auditFingerprint("user-1", "resume text", "Software Engineer");
    expect(a).toBe(b);
  });
  it("differs across users", () => {
    const a = auditFingerprint("user-1", "x", "y");
    const b = auditFingerprint("user-2", "x", "y");
    expect(a).not.toBe(b);
  });
  it("differs when resume changes", () => {
    const a = auditFingerprint("u", "abc", "role");
    const b = auditFingerprint("u", "abd", "role");
    expect(a).not.toBe(b);
  });
});
