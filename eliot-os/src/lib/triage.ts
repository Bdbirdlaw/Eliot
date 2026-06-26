import "server-only";
import { prisma } from "./prisma";
import { env } from "./env";
import { getModelProvider } from "./providers/model";
import { getVaultSink, type HandymanEventKind } from "./providers/vault";
import { getNotifyProvider } from "./providers/notify";
import type { TriageBucket } from "./constants";

/**
 * The Handyman triage engine (section 8). Runs on the SERVER. The hard rules
 * and the safety nets are in CODE; the model only handles the ambiguous middle,
 * and any failure falls through to the queue (fail safe toward the human).
 */

export type TriageInput = {
  workstreamId: string;
  reporterId: string;
  issue: string;
  safetyAffected: boolean;
  hasQuote: boolean;
  amount: number | null;
  canWait: boolean;
  // public path of the stored photo (e.g. /uploads/abc.jpg), or null
  photoUrl: string | null;
  // base64 data URL for the vision model (never stored), or null
  photoDataUrl: string | null;
  // escape hatch reason when no photo was possible
  noPhotoReason: string | null;
};

export type TriageOutcome = {
  reportId: string;
  bucket: TriageBucket;
  decisionSource: string;
  summary: string;
  recommendation: string;
  status: string;
};

const STATUS_FOR: Record<TriageBucket, string> = {
  auto: "logged",
  queue: "queued",
  escalate: "escalated",
};

const EVENT_KIND_FOR: Record<TriageBucket, HandymanEventKind> = {
  auto: "logged",
  queue: "queued",
  escalate: "escalated",
};

type Decision = {
  bucket: TriageBucket;
  decisionSource: string;
  summary: string;
  recommendation: string;
};

async function decide(input: TriageInput): Promise<Decision> {
  const threshold = env.triageAutoApproveThreshold;

  // Hard rule 1: safety or habitability affected => escalate immediately.
  if (input.safetyAffected) {
    return {
      bucket: "escalate",
      decisionSource: "hard_safety",
      summary: "Safety or habitability is affected.",
      recommendation: "Escalated immediately for a person to handle.",
    };
  }

  // Escape hatch: no photo possible => route straight to the queue.
  if (!input.photoUrl) {
    return {
      bucket: "queue",
      decisionSource: "no_photo",
      summary: `No photo available. Reason: ${input.noPhotoReason ?? "not given"}`,
      recommendation: "Routed to the review queue because no photo could be taken.",
    };
  }

  // Hard rule 2: a quote at or under the threshold that can wait => auto approve.
  if (input.hasQuote && input.amount != null && input.amount <= threshold && input.canWait) {
    return {
      bucket: "auto",
      decisionSource: "hard_threshold",
      summary: `Routine repair within the $${threshold} auto approve threshold.`,
      recommendation: "Logged. The contractor is cleared to proceed.",
    };
  }

  // Otherwise: ask the model (photo is authoritative). On any failure: queue.
  try {
    const result = await getModelProvider().classifyMaintenance({
      workstream: (await workstreamName(input.workstreamId)) ?? "Unknown",
      issue: input.issue,
      safetyAffected: input.safetyAffected,
      hasQuote: input.hasQuote,
      amount: input.amount,
      canWait: input.canWait,
      photoDataUrl: input.photoDataUrl,
    });

    let bucket = result.bucket;
    let decisionSource = "model";

    // Safety nets: never auto approve over threshold or without a quote.
    if (bucket === "auto") {
      const overThreshold = input.amount != null && input.amount > threshold;
      if (!input.hasQuote || input.amount == null || overThreshold || !input.canWait) {
        bucket = "queue";
        decisionSource = "model_safety_net";
      }
    }

    return {
      bucket,
      decisionSource,
      summary: result.summary,
      recommendation: result.recommendation,
    };
  } catch {
    // Fail safe toward the human.
    return {
      bucket: "queue",
      decisionSource: "failsafe",
      summary: "Could not classify automatically.",
      recommendation: "Routed to the review queue for a person to decide.",
    };
  }
}

async function workstreamName(id: string): Promise<string | null> {
  const ws = await prisma.workstream.findUnique({ where: { id } });
  return ws?.name ?? null;
}

export async function runTriage(input: TriageInput): Promise<TriageOutcome> {
  const decision = await decide(input);
  const status = STATUS_FOR[decision.bucket];

  const report = await prisma.maintenanceReport.create({
    data: {
      workstreamId: input.workstreamId,
      reporterId: input.reporterId,
      issue: input.issue,
      safetyAffected: input.safetyAffected,
      hasQuote: input.hasQuote,
      amount: input.amount,
      canWait: input.canWait,
      photoUrl: input.photoUrl,
      noPhotoReason: input.noPhotoReason,
      bucket: decision.bucket,
      decisionSource: decision.decisionSource,
      summary: decision.summary,
      recommendation: decision.recommendation,
      status,
    },
    include: { workstream: true, reporter: true },
  });

  // Write the append only event into the vault inbox via VaultSink.
  let vaultEventPath: string | null = null;
  try {
    const { path } = await getVaultSink().writeHandymanEvent({
      kind: EVENT_KIND_FOR[decision.bucket],
      reportId: report.id,
      workstream: report.workstream.name,
      bucket: decision.bucket,
      status,
      issue: report.issue,
      safetyAffected: report.safetyAffected,
      hasQuote: report.hasQuote,
      amount: report.amount,
      canWait: report.canWait,
      summary: report.summary,
      recommendation: report.recommendation,
      decisionSource: report.decisionSource,
      photoUrl: report.photoUrl,
      noPhotoReason: report.noPhotoReason,
      reporterName: report.reporter.name,
      reporterEmail: report.reporter.email,
      createdAtISO: report.createdAt.toISOString(),
    });
    vaultEventPath = path;
    await prisma.maintenanceReport.update({
      where: { id: report.id },
      data: { vaultEventPath },
    });
  } catch (e) {
    // The report still exists; surfacing the vault write failure should not
    // strand the contractor. Operator can re emit. Log for visibility.
    // eslint-disable-next-line no-console
    console.error("VaultSink write failed:", e);
  }

  // Escalations notify Eliot immediately (outside the draft and approve queue).
  if (decision.bucket === "escalate") {
    await getNotifyProvider()
      .notifyEliot({
        title: `Escalation: ${report.workstream.name}`,
        body: `${report.issue}\n\n${decision.summary}\n${decision.recommendation}`,
        link: `/console/maintenance`,
      })
      .catch((e) => console.error("notify failed:", e));
  }

  return {
    reportId: report.id,
    bucket: decision.bucket,
    decisionSource: decision.decisionSource,
    summary: decision.summary,
    recommendation: decision.recommendation,
    status,
  };
}
