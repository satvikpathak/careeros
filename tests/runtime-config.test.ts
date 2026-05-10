import { describe, it, expect } from "vitest";
import { runtime, maxDuration, dynamic } from "@/lib/runtime-config";

describe("runtime-config", () => {
  it("uses Node runtime", () => {
    expect(runtime).toBe("nodejs");
  });
  it("allows up to 60s", () => {
    expect(maxDuration).toBe(60);
  });
  it("forces dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
