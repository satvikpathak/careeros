import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HEAVY_ROUTES = [
  "src/app/api/resume/route.ts",
  "src/app/api/chat/route.ts",
  "src/app/api/roadmap/route.ts",
  "src/app/api/roadmap/progress/route.ts",
  "src/app/api/quiz/route.ts",
  "src/app/api/sprint/generate/route.ts",
  "src/app/api/match/route.ts",
  "src/app/api/jobs/route.ts",
  "src/app/api/market-radar/route.ts",
  "src/app/api/project-builder/route.ts",
  "src/app/api/resources/route.ts",
  "src/app/api/dashboard/data/route.ts",
  "src/app/api/dashboard/task/toggle/route.ts",
];

describe("heavy API routes", () => {
  for (const rel of HEAVY_ROUTES) {
    it(`${rel} re-exports runtime-config`, () => {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src).toMatch(/from\s+["']@\/lib\/runtime-config["']/);
    });
  }
});
