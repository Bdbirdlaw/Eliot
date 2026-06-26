"use client";

import { useActionState, useState } from "react";
import {
  requestSelfBooking,
  type BookingActionState,
} from "@/lib/booking-actions";
import type { AvailableSlot } from "@/lib/booking";

const initial: BookingActionState = { idle: true };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function BookingPanel({
  slots,
  tone = "ink",
  note,
}: {
  slots: AvailableSlot[];
  tone?: "ink" | "paper";
  note?: string;
}) {
  const [state, formAction, pending] = useActionState(requestSelfBooking, initial);
  const [selected, setSelected] = useState<string | null>(null);

  if ("ok" in state && state.ok) {
    return (
      <div className={tone === "paper" ? "card-dark p-6" : "card p-6"}>
        <p className="font-display text-xl">
          {state.status === "confirmed" ? "Confirmed" : "Requested"}
        </p>
        <p className="mt-2 text-gray-mut">
          {state.status === "confirmed"
            ? "On the calendar. A confirmation follows."
            : "Submitted. You will be notified on confirmation."}
        </p>
      </div>
    );
  }

  // Group slots by day.
  const byDay = new Map<string, AvailableSlot[]>();
  for (const s of slots) {
    const key = dayLabel(s.startISO);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }
  const days = [...byDay.entries()].slice(0, 6);

  return (
    <form action={formAction} className="space-y-5">
      {note && <p className="text-sm text-gray-mut">{note}</p>}
      {slots.length === 0 && (
        <p className="text-sm text-gray-mut">No open times in the current window.</p>
      )}
      {days.map(([day, daySlots]) => (
        <div key={day}>
          <p className="eyebrow mb-2">{day}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.slice(0, 10).map((s) => (
              <button
                key={s.startISO}
                type="button"
                onClick={() => setSelected(s.startISO)}
                aria-pressed={selected === s.startISO}
                className={`border px-3 py-2 text-sm ${
                  selected === s.startISO
                    ? "border-accent bg-accent text-white"
                    : "border-gray-rule bg-paper-raised text-ink hover:border-accent"
                }`}
              >
                {timeLabel(s.startISO)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected && <input type="hidden" name="startISO" value={selected} />}
      <textarea
        name="notes"
        rows={2}
        placeholder="Anything to add (optional)"
        className="field"
      />
      {"ok" in state && !state.ok && <p className="text-sm text-stop">{state.error}</p>}
      <button type="submit" className="btn-accent" disabled={pending || !selected}>
        {pending ? "Booking" : "Request this time"}
      </button>
    </form>
  );
}
