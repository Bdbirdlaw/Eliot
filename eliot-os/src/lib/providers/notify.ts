import "server-only";
import { env } from "../env";
import { getEmailProvider } from "./email";

/**
 * NotifyProvider: the immediate ping channel for escalations (section 8).
 * Distinct from drafted email: an escalation is an alert, not a high stakes
 * outbound message, so it bypasses the draft and approve queue. Mock logs;
 * real sends to ELIOT_NOTIFY_EMAIL via Resend (swap for SMS later).
 */

export type Notification = {
  title: string;
  body: string;
  // a relative link into the operator console for context
  link?: string;
};

export interface NotifyProvider {
  notifyEliot(n: Notification): Promise<void>;
}

class MockNotifyProvider implements NotifyProvider {
  async notifyEliot(n: Notification): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mock notify -> Eliot] ${n.title}\n  ${n.body}${n.link ? `\n  link: ${env.appUrl}${n.link}` : ""}\n`
    );
  }
}

class EmailNotifyProvider implements NotifyProvider {
  async notifyEliot(n: Notification): Promise<void> {
    await getEmailProvider().send({
      to: env.eliotNotifyEmail,
      subject: `[Eliot OS] ${n.title}`,
      body: `${n.body}${n.link ? `\n\n${env.appUrl}${n.link}` : ""}`,
    });
  }
}

let cached: NotifyProvider | null = null;

export function getNotifyProvider(): NotifyProvider {
  if (cached) return cached;
  cached =
    env.providers.notify === "real"
      ? new EmailNotifyProvider()
      : new MockNotifyProvider();
  return cached;
}
