import "server-only";
import { prisma } from "./prisma";
import { createOutbound } from "./email-service";
import type { EmailLane } from "./constants";

/**
 * Nurture journey engine.
 *
 * A journey is an ordered set of steps, each due a number of days after
 * enrollment. When a step comes due the engine writes the email as a DRAFT into
 * the approval queue (forceDraft), never auto sending, so it honors the draft
 * and approve non negotiable even in the contractor lane. Resend only delivers
 * once a human approves the draft in the Operator Console.
 *
 * Timing is measured from enrollment, not from approval, so the cadence is
 * predictable. The runner (advanceDueJourneys) is idempotent per due step and
 * safe to call repeatedly from a cron or a console button.
 */

const DAY_MS = 86_400_000;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function render(template: string, user: { name: string }): string {
  return template
    .replace(/\{\{\s*firstName\s*\}\}/g, firstName(user.name))
    .replace(/\{\{\s*name\s*\}\}/g, user.name);
}

/** Enroll a user in a journey by key. No op if already enrolled. */
export async function enrollInJourney(
  journeyKey: string,
  userId: string,
  now: Date = new Date()
): Promise<{ ok: boolean; reason?: string }> {
  const journey = await prisma.journey.findUnique({
    where: { key: journeyKey },
    include: { steps: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!journey || !journey.active) return { ok: false, reason: "journey not found" };
  const existing = await prisma.journeyEnrollment.findUnique({
    where: { journeyId_userId: { journeyId: journey.id, userId } },
  });
  if (existing) return { ok: false, reason: "already enrolled" };

  const firstStep = journey.steps[0];
  const nextRunAt = firstStep ? new Date(now.getTime() + firstStep.dayOffset * DAY_MS) : null;
  await prisma.journeyEnrollment.create({
    data: { journeyId: journey.id, userId, enrolledAt: now, nextRunAt, currentStep: 0 },
  });
  return { ok: true };
}

/**
 * Emit any steps that are due across all active enrollments. Returns the number
 * of drafts created. Each enrollment may emit several steps if it has fallen
 * behind. Idempotent: currentStep guards against re emitting a step.
 */
export async function advanceDueJourneys(now: Date = new Date()): Promise<{ drafts: number }> {
  const due = await prisma.journeyEnrollment.findMany({
    where: { status: "active", nextRunAt: { not: null, lte: now } },
    include: { journey: { include: { steps: { orderBy: { order: "asc" } } } }, user: true },
  });

  let drafts = 0;
  for (const enrollment of due) {
    const steps = enrollment.journey.steps;
    let currentStep = enrollment.currentStep;
    let nextRunAt: Date | null = enrollment.nextRunAt;
    let status = enrollment.status;

    // Emit every step whose scheduled time has passed.
    while (true) {
      const step = steps[currentStep]; // steps are 0 indexed in the array
      if (!step) {
        status = "completed";
        nextRunAt = null;
        break;
      }
      const dueAt = new Date(enrollment.enrolledAt.getTime() + step.dayOffset * DAY_MS);
      if (dueAt > now) {
        nextRunAt = dueAt;
        break;
      }
      await createOutbound({
        lane: enrollment.journey.lane as EmailLane,
        toUserId: enrollment.userId,
        toEmail: enrollment.user.email,
        subject: render(step.subject, enrollment.user),
        body: render(step.body, enrollment.user),
        templateKey: `journey:${enrollment.journey.key}:${step.order}`,
        forceDraft: true,
      });
      drafts += 1;
      currentStep += 1;
    }

    await prisma.journeyEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStep, nextRunAt, status },
    });
  }

  return { drafts };
}

export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  await prisma.journeyEnrollment.updateMany({
    where: { id: enrollmentId, status: "active" },
    data: { status: "cancelled", nextRunAt: null },
  });
}
