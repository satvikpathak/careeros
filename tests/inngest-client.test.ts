import { describe, it, expect } from "vitest";
import { inngest, auditRun } from "@/lib/jobs/inngest";

describe("inngest", () => {
  it("exports a client with id 'careeros'", () => {
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe("careeros");
  });

  it("exposes auditRun function", () => {
    expect(auditRun).toBeDefined();
    // Inngest v4: createFunction returns an object with fn (handler) and id() (string accessor)
    expect(typeof auditRun.fn).toBe("function");
    expect(auditRun.id()).toBe("audit-run");
  });
});
