import { describe, it, expect } from "vitest";
import { tokens } from "@/components/ui/tokens";

describe("tokens", () => {
  it("ink is near-black", () => {
    expect(tokens.colors.ink).toBe("#0A0A0A");
  });
  it("no remnant of legacy brand blue", () => {
    const flat = JSON.stringify(tokens).toLowerCase();
    expect(flat).not.toContain("#005bb7");
    expect(flat).not.toContain("#004b99");
  });
  it("exposes radius scale", () => {
    expect(tokens.radii.sm).toBe(8);
    expect(tokens.radii.md).toBe(12);
    expect(tokens.radii.lg).toBe(16);
  });
});
