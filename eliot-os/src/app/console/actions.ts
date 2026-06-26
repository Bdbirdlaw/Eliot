"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { WORKSTREAM_LANES } from "@/lib/constants";
import { approveAndSend, discardDraft, editDraft } from "@/lib/email-service";
import { approveBooking, declineBooking } from "@/lib/booking";
import { advanceDueJourneys, enrollInJourney, cancelEnrollment } from "@/lib/journey";

// Assign (or clear) a workstream's experience lane. Eliot does this by hand;
// the seven workstreams ship unassigned on purpose.
export async function setWorkstreamLane(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("workstreamId") ?? "");
  const raw = String(formData.get("experience") ?? "");
  const experience = WORKSTREAM_LANES.includes(raw as never) ? raw : null;
  await prisma.workstream.update({ where: { id }, data: { experience } });
  revalidatePath("/console/workstreams");
}

export async function setUserActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/console/users");
}

const RuleSchema = z.object({
  role: z.string(),
  slotMinutes: z.coerce.number().int().min(5).max(240),
  leadTimeHours: z.coerce.number().int().min(0).max(720),
  requiresApproval: z.string().optional(),
  routeToTriage: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(99),
});

export async function updateBookingRule(formData: FormData) {
  await requireAdmin();
  const parsed = RuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  await prisma.bookingRule.update({
    where: { role: d.role },
    data: {
      slotMinutes: d.slotMinutes,
      leadTimeHours: d.leadTimeHours,
      requiresApproval: d.requiresApproval === "on",
      routeToTriage: d.routeToTriage === "on",
      priority: d.priority,
    },
  });
  revalidatePath("/console/booking-rules");
}

export async function approveEmail(formData: FormData) {
  const { user } = await requireAdmin();
  await approveAndSend(String(formData.get("draftId") ?? ""), user.id);
  revalidatePath("/console/email");
}

export async function editEmail(formData: FormData) {
  await requireAdmin();
  await editDraft(
    String(formData.get("draftId") ?? ""),
    String(formData.get("subject") ?? ""),
    String(formData.get("body") ?? "")
  );
  revalidatePath("/console/email");
}

export async function discardEmail(formData: FormData) {
  await requireAdmin();
  await discardDraft(String(formData.get("draftId") ?? ""));
  revalidatePath("/console/email");
}

export async function approveBookingReq(formData: FormData) {
  await requireAdmin();
  await approveBooking(String(formData.get("bookingId") ?? ""));
  revalidatePath("/console/bookings");
}

export async function declineBookingReq(formData: FormData) {
  await requireAdmin();
  await declineBooking(String(formData.get("bookingId") ?? ""));
  revalidatePath("/console/bookings");
}

export async function resolveReport(formData: FormData) {
  await requireAdmin();
  await prisma.maintenanceReport.update({
    where: { id: String(formData.get("reportId") ?? "") },
    data: { status: "resolved" },
  });
  revalidatePath("/console/maintenance");
}

// --- Nurture journeys --------------------------------------------------------

export async function enrollInJourneyAction(formData: FormData) {
  await requireAdmin();
  const journeyKey = String(formData.get("journeyKey") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (journeyKey && userId) await enrollInJourney(journeyKey, userId);
  revalidatePath("/console/journeys");
}

export async function cancelEnrollmentAction(formData: FormData) {
  await requireAdmin();
  await cancelEnrollment(String(formData.get("enrollmentId") ?? ""));
  revalidatePath("/console/journeys");
}

// Emit any due steps as drafts now. In production a cron hits the API route.
export async function runJourneysAction() {
  await requireAdmin();
  await advanceDueJourneys(new Date());
  revalidatePath("/console/journeys");
  revalidatePath("/console/email");
}
