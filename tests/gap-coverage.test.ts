import { describe, it, expect } from "vitest";
import { computeCoverage } from "@/lib/gap/run";

describe("computeCoverage", () => {
  it("returns matched + missing + score", () => {
    const cov = computeCoverage(
      ["typescript", "react", "kubernetes", "graphql"],
      ["TypeScript", "react", "Postgres"]
    );
    expect(cov.matched.sort()).toEqual(["react", "typescript"]);
    expect(cov.missing.sort()).toEqual(["graphql", "kubernetes"]);
    expect(cov.score).toBe(50);
  });

  it("returns 100 when no JD keywords", () => {
    const cov = computeCoverage([], ["x"]);
    expect(cov.score).toBe(100);
  });
});
