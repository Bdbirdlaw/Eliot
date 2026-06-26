"use server";

import { z } from "zod";
import { requireUser } from "./guard";
import { isAdmin } from "./auth";
import { createBooking } from "./booking";

export type BookingActionState =
  | { ok: true; status: "requested" | "confirmed" }
  | { ok: false; error: string }
  | { idle: true };

const Body = z.object({
  startISO: z.string().min(1),
  notes: z.string().max(500).optional(),
});

// Self booking for the signed in user, scoped to their own lane. Contractors
// and tenants may not book general meetings (their issues go through triage).
export async function requestSelfBooking(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const user = await requireUser();
  const lane = user.experience;
  const canBook = isAdmin(user) || lane === "fund" || lane === "family";
  if (!canBook) {
    return { ok: false, error: "This lane does not offer general meeting booking." };
  }

  const parsed = Body.safeParse({
    startISO: formData.get("startISO"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Pick a time slot first." };

  const result = await createBooking({
    userId: user.id,
    role: user.role,
    experience: lane,
    startISO: parsed.data.startISO,
    notes: parsed.data.notes,
    attendeeEmail: user.email,
    attendeeName: user.name,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, status: result.status };
}
