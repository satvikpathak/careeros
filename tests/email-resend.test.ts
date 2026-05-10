import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn(() => Promise.resolve({ id: "test" }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn(() => Promise.resolve("<p>html</p>")),
}));

vi.mock("@/lib/email/subscriptions", () => ({
  isEnabled: vi.fn(() => Promise.resolve(true)),
}));

import { sendEmail } from "@/lib/email/resend";
import { isEnabled } from "@/lib/email/subscriptions";

describe("sendEmail", () => {
  beforeEach(() => {
    sendMock.mockClear();
    (isEnabled as any).mockResolvedValue(true);
  });

  it("skips when RESEND_API_KEY missing", async () => {
    delete process.env.RESEND_API_KEY;
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips when subscription disabled", async () => {
    process.env.RESEND_API_KEY = "test";
    (isEnabled as any).mockResolvedValue(false);
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends when configured and enabled", async () => {
    process.env.RESEND_API_KEY = "test";
    (isEnabled as any).mockResolvedValue(true);
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
  });
});
