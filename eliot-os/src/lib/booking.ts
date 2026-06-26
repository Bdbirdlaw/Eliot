import "server-only";
import { prisma } from "./prisma";
import { getCalendarProvider, type Slot } from "./providers/calendar";

/**
 * Booking service (section 9). Per role rules are computed on the SERVER from
 * configurable BookingRule records. Availability ALWAYS excludes time Eliot has
 * filled: every offered slot is checked against free/busy, and a requested slot
 * is re checked at confirm time so an overlap can never slip through.
 */

const HORIZON_DAYS = 14;

export type AvailableSlot = { startISO: string; endISO: string };

export async function getRule(role: string) {
  return prisma.bookingRule.findUnique({ where: { role } });
}

function horizon(now: Date): { start: Date; end: Date } {
  return { start: now, end: new Date(now.getTime() + HORIZON_DAYS * 86400_000) };
}

export async function getAvailability(role: string): Promise<AvailableSlot[]> {
  const rule = await getRule(role);
  if (!rule) return [];
  const range = horizon(new Date());
  const slots = await getCalendarProvider().getAvailableSlots(range, {
    slotMinutes: rule.slotMinutes,
    leadTimeHours: rule.leadTimeHours,
    priority: role === "investor",
  });
  // Family lane wants the soonest first; everyone else also reads chronologically.
  return slots
    .slice(0, 40)
    .map((s) => ({ startISO: s.start.toISOString(), endISO: s.end.toISOString() }));
}

export type CreateBookingInput = {
  userId: string;
  role: string;
  experience: string;
  startISO: string;
  notes?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  // When an admin books on behalf of someone, the per role rules are bypassed.
  bypassRules?: boolean;
};

export type CreateBookingResult =
  | { ok: true; status: "requested" | "confirmed"; bookingId: string }
  | { ok: false; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const rule = await getRule(input.role);
  if (!rule && !input.bypassRules) {
    return { ok: false, error: "No booking rule configured for this role." };
  }
  const slotMinutes = rule?.slotMinutes ?? 30;
  const start = new Date(input.startISO);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Invalid time." };
  const end = new Date(start.getTime() + slotMinutes * 60_000);
  const slot: Slot = { start, end };

  if (!input.bypassRules && rule) {
    // Enforce minimum lead time on the server.
    const earliest = new Date(Date.now() + rule.leadTimeHours * 3600_000);
    if (start < earliest) {
      return { ok: false, error: `This slot is inside the ${rule.leadTimeHours} hour lead time.` };
    }
  }

  // Re check against busy time. Never confirm a slot that overlaps a busy block.
  const calendar = getCalendarProvider();
  const busy = await calendar.getFreeBusy({ start, end });
  if (busy.some((b) => start < b.end && b.start < end)) {
    return { ok: false, error: "That time is no longer free. Pick another slot." };
  }

  const requiresApproval = input.bypassRules ? false : rule?.requiresApproval ?? true;
  const status: "requested" | "confirmed" = requiresApproval ? "requested" : "confirmed";

  // Instant bookings are written to the calendar now; requests wait for approval.
  if (status === "confirmed") {
    await calendar
      .createBooking(slot, {
        summary: `Eliot OS: ${input.experience} meeting`,
        description: input.notes,
        attendeeEmail: input.attendeeEmail,
      })
      .catch((e) => console.error("calendar createBooking failed:", e));
  }

  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      experience: input.experience,
      start,
      end,
      status,
      notes: input.notes ?? null,
    },
  });

  return { ok: true, status, bookingId: booking.id };
}

/** Operator approves a pending request and writes it to the calendar. */
export async function approveBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking || booking.status !== "requested") return;
  await getCalendarProvider()
    .createBooking(
      { start: booking.start, end: booking.end },
      {
        summary: `Eliot OS: ${booking.experience} meeting`,
        description: booking.notes ?? undefined,
        attendeeEmail: booking.user.email,
      }
    )
    .catch((e) => console.error("calendar createBooking failed:", e));
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "confirmed" } });
}

export async function declineBooking(bookingId: string): Promise<void> {
  await prisma.booking.updateMany({
    where: { id: bookingId, status: "requested" },
    data: { status: "declined" },
  });
}
