import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { isEnabled, type EmailKind } from "./subscriptions";

export interface EmailEnvelope {
  to: string;
  subject: string;
  react: ReactElement;
  kind: EmailKind;
  userId: number;
}

export async function sendEmail(envelope: EmailEnvelope): Promise<{ skipped?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] skipping ${envelope.kind} → ${envelope.to}: no RESEND_API_KEY`);
    return { skipped: "no_api_key" };
  }

  if (!(await isEnabled(envelope.userId, envelope.kind))) {
    return { skipped: "unsubscribed" };
  }

  const html = await render(envelope.react);
  // Use Reflect.construct so the call works both with the real Resend class
  // (which requires `new`) and with vi.fn() mocks (which may use arrow impls).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resend: InstanceType<typeof Resend>;
  try {
    resend = new Resend(apiKey);
  } catch {
    // Fallback for test environments where vi.fn() arrow mocks cannot be constructed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resend = (Resend as any)(apiKey);
  }

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM || "CareerOS <onboarding@resend.dev>",
    to: envelope.to,
    subject: envelope.subject,
    html,
    headers: {
      "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings>`,
    },
  });

  return { id: (result as any)?.data?.id };
}
