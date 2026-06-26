import "server-only";
import { env } from "../env";

/**
 * EmailProvider (section 10). Resend is the sending PIPE, not the brain.
 *
 * High stakes lanes (investor, family, prospect) are always draft and approve;
 * that policy lives in the email service layer, not here. This provider only
 * delivers an already approved message. The mock logs; the real one calls Resend.
 */

export type OutboundEmail = {
  to: string;
  subject: string;
  body: string; // plain text / light markdown
  from?: string;
};

export interface EmailProvider {
  send(email: OutboundEmail): Promise<{ id: string }>;
}

class MockEmailProvider implements EmailProvider {
  async send(email: OutboundEmail): Promise<{ id: string }> {
    const id = `mock-email-${Date.now()}`;
    // eslint-disable-next-line no-console
    console.log(
      `\n[mock email] -> ${email.to}\n  from: ${email.from ?? env.emailFrom}\n  subj: ${email.subject}\n  ${email.body.replace(/\n/g, "\n  ")}\n`
    );
    return { id };
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(email: OutboundEmail): Promise<{ id: string }> {
    // Lazy import so the dependency is only touched when EMAIL_PROVIDER=real.
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendApiKey);
    const res = await resend.emails.send({
      from: email.from ?? env.emailFrom,
      to: email.to,
      subject: email.subject,
      text: email.body,
    });
    if (res.error) throw new Error(`Resend error: ${res.error.message}`);
    return { id: res.data?.id ?? "resend-unknown" };
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  cached =
    env.providers.email === "real"
      ? new ResendEmailProvider()
      : new MockEmailProvider();
  return cached;
}
