import { describe, it, expect } from "vitest";
import { applications, dailyCheckins, emailSubscriptions } from "@/db/schema";

describe("phase 2B schema", () => {
  it("applications has required columns", () => {
    const cols = Object.keys(applications);
    for (const c of ["id", "userId", "jobTitle", "company", "location", "sourceUrl", "jobSnapshot", "status", "notes", "appliedAt", "nextActionAt", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("dailyCheckins has required columns", () => {
    const cols = Object.keys(dailyCheckins);
    for (const c of ["id", "userId", "checkinDate", "summary", "applicationsSent", "hoursStudied", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("emailSubscriptions has required columns", () => {
    const cols = Object.keys(emailSubscriptions);
    for (const c of ["id", "userId", "kind", "enabled", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });
});
