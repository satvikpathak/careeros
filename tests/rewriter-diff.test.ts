import { describe, it, expect } from "vitest";
import { buildDiffSegments } from "@/lib/rewriter/diff";

describe("buildDiffSegments", () => {
  it("creates one segment per bullet pair", () => {
    const segs = buildDiffSegments({
      sections: [{
        title: "Experience",
        originalBullets: ["Built A", "Built B"],
        rewrittenBullets: ["Architected A", "Shipped B"],
      }],
    });
    expect(segs.length).toBe(2);
    expect(segs[0].original).toBe("Built A");
    expect(segs[0].suggested).toBe("Architected A");
    expect(segs[0].accepted).toBe(null);
    expect(segs[0].section).toBe("Experience");
  });

  it("handles section count mismatch by truncating to min length", () => {
    const segs = buildDiffSegments({
      sections: [{
        title: "Experience",
        originalBullets: ["A", "B", "C"],
        rewrittenBullets: ["A2", "B2"],
      }],
    });
    expect(segs.length).toBe(2);
  });
});
