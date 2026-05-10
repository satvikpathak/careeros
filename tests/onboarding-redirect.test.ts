import { describe, it, expect } from "vitest";
import { shouldRedirectToOnboarding } from "@/lib/audit/require-onboarded";

describe("shouldRedirectToOnboarding", () => {
  it("redirects when not onboarded and not already on wizard", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/dashboard")).toBe(true);
  });
  it("does not redirect when on the wizard route", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/dashboard/onboarding")).toBe(false);
  });
  it("does not redirect when already onboarded", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: new Date() }, "/dashboard")).toBe(false);
  });
  it("does not redirect on auth pages", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/sign-in")).toBe(false);
  });
});
