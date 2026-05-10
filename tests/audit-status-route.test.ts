import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { auditJobs: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "clerk-123" })),
}));

import { GET } from "@/app/api/audit/[jobId]/route";
import { db } from "@/db";

describe("GET /api/audit/[jobId]", () => {
  it("returns 404 when job missing", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.auditJobs.findFirst as any).mockResolvedValue(null);
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when job belongs to a different user", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.auditJobs.findFirst as any).mockResolvedValue({ id: 42, userId: 999, status: "queued" });
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 + status payload for owner", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.auditJobs.findFirst as any).mockResolvedValue({ id: 42, userId: 1, status: "running", progress: { stage: "ai", pct: 50 }, auditId: null, error: null });
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("running");
    expect(json.data.progress.pct).toBe(50);
  });
});
