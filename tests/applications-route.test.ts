import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { applications: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1, status: "applied" }])) })) })) })),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "clerk-123" })),
}));

import { PATCH } from "@/app/api/applications/[id]/route";
import { db } from "@/db";

describe("PATCH /api/applications/[id]", () => {
  it("returns 403 for cross-user update", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.applications.findFirst as any).mockResolvedValue({ id: 9, userId: 999 });

    const req = new Request("http://localhost/api/applications/9", {
      method: "PATCH",
      body: JSON.stringify({ status: "applied" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: "9" }) });
    expect(res.status).toBe(403);
  });
});
