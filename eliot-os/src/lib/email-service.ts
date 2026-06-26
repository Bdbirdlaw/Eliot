import "server-only";
import { prisma } from "./prisma";
import { getEmailProvider } from "./providers/email";
import { AUTO_SEND_LANES, type EmailLane } from "./constants";

/**
 * Email policy layer (section 10 + Non Negotiable 3).
 *
 * High stakes lanes (fund, family) are ALWAYS draft and approve. Only
 * whitelisted routine templates in the contractor or portfolio lane may send
 * automatically. Resend is just the pipe; this layer decides what is allowed to
 * leave without a human.
 */

// The only templates allowed to auto send, and only in their listed lane.
const AUTO_SEND_TEMPLATES: Record<string, EmailLane> = {
  contractor_report_logged: "contractor",
  contractor_cleared_to_proceed: "contractor",
  portfolio_maintenance_ack: "portfolio",
};

export function isAutoSendAllowed(lane: EmailLane, templateKey?: string | null): boolean {
  if (!templateKey) return false;
  if (!AUTO_SEND_LANES.includes(lane)) return false;
  return AUTO_SEND_TEMPLATES[templateKey] === lane;
}

export type CreateDraftInput = {
  lane: EmailLane;
  toUserId?: string;
  toEmail: string;
  subject: string;
  body: string;
  templateKey?: string;
  // Force the message to be held as a draft even if it would otherwise be
  // whitelisted to auto send. Nurture journey steps set this so every touch is
  // reviewed before it leaves.
  forceDraft?: boolean;
};

/**
 * Create an outbound email. Routine whitelisted templates in the allowed lanes
 * send immediately and are recorded as sent. Everything else is held as a draft
 * for human approval in the Operator Console.
 */
export async function createOutbound(input: CreateDraftInput) {
  const autoSendEligible =
    !input.forceDraft && isAutoSendAllowed(input.lane, input.templateKey);

  if (autoSendEligible) {
    const { id } = await getEmailProvider().send({
      to: input.toEmail,
      subject: input.subject,
      body: input.body,
    });
    return prisma.emailDraft.create({
      data: {
        lane: input.lane,
        toUserId: input.toUserId ?? null,
        toEmail: input.toEmail,
        subject: input.subject,
        body: input.body,
        templateKey: input.templateKey ?? null,
        autoSendEligible: true,
        status: "sent",
        sentAt: new Date(),
        approvedBy: `auto:${id}`,
      },
    });
  }

  return prisma.emailDraft.create({
    data: {
      lane: input.lane,
      toUserId: input.toUserId ?? null,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      templateKey: input.templateKey ?? null,
      autoSendEligible: false,
      status: "draft",
    },
  });
}

export async function approveAndSend(draftId: string, approverId: string) {
  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
  if (!draft || (draft.status !== "draft" && draft.status !== "approved")) return;
  const { id } = await getEmailProvider().send({
    to: draft.toEmail,
    subject: draft.subject,
    body: draft.body,
  });
  await prisma.emailDraft.update({
    where: { id: draftId },
    data: { status: "sent", sentAt: new Date(), approvedBy: `${approverId}:${id}` },
  });
}

export async function editDraft(draftId: string, subject: string, body: string) {
  await prisma.emailDraft.updateMany({
    where: { id: draftId, status: "draft" },
    data: { subject, body },
  });
}

export async function discardDraft(draftId: string) {
  await prisma.emailDraft.updateMany({
    where: { id: draftId, status: { in: ["draft", "approved"] } },
    data: { status: "discarded" },
  });
}
