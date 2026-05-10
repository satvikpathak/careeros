import { describe, it, expect } from "vitest";
import { inngest, auditRun } from "@/lib/jobs/inngest";

describe("inngest", () => {
  it("exports a client with id 'careeros'", () => {
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe("careeros");
  });

  it("exposes auditRun function", () => {
    expect(auditRun).toBeDefined();
    // Inngest v4: createFunction returns an object; id() returns the function id string
    expect(auditRun.id()).toBe("audit-run");
    // fn is the internal handler — access via cast to bypass private visibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (auditRun as any).fn).toBe("function");
  });
});
