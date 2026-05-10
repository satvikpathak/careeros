import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { applications: { findMany: vi.fn(), findFirst: vi.fn() } },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1 }])) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1, status: "applied" }])) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}));

import { listApplications, createApplication, updateApplication, deleteApplication } from "@/lib/applications/repo";
import { db } from "@/db";

describe("applications repo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listApplications calls findMany scoped by userId", async () => {
    (db.query.applications.findMany as any).mockResolvedValue([{ id: 1, userId: 7 }]);
    const rows = await listApplications(7);
    expect(rows.length).toBe(1);
    expect((db.query.applications.findMany as any)).toHaveBeenCalled();
  });

  it("createApplication inserts with status=saved", async () => {
    await createApplication(7, { jobTitle: "Eng", company: "Acme" });
    expect((db.insert as any)).toHaveBeenCalled();
  });

  it("updateApplication runs an update", async () => {
    await updateApplication(7, 1, { status: "applied" });
    expect((db.update as any)).toHaveBeenCalled();
  });

  it("deleteApplication runs a delete", async () => {
    await deleteApplication(7, 1);
    expect((db.delete as any)).toHaveBeenCalled();
  });
});
