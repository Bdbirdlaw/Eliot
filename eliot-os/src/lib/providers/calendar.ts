import "server-only";
import { env } from "../env";

/**
 * CalendarProvider (section 9). Availability ALWAYS excludes time Eliot already
 * has filled: a slot that overlaps a busy block is never offered.
 *
 * MockCalendarProvider produces deterministic, realistic busy blocks (the
 * default). GoogleCalendarProvider reads real free/busy and creates events via
 * server side OAuth. Both share the same slot computation so behavior matches.
 */

export type TimeRange = { start: Date; end: Date };
export type BusyBlock = { start: Date; end: Date };
export type Slot = { start: Date; end: Date };

export type SlotRules = {
  slotMinutes: number;
  leadTimeHours: number;
  // investor lane: bias toward earlier "priority" windows in the day
  priority?: boolean;
};

export type BookingDetails = {
  summary: string;
  description?: string;
  attendeeEmail?: string;
};

export interface CalendarProvider {
  getFreeBusy(range: TimeRange): Promise<BusyBlock[]>;
  getAvailableSlots(range: TimeRange, rules: SlotRules): Promise<Slot[]>;
  createBooking(slot: Slot, details: BookingDetails): Promise<{ id: string }>;
}

// --- Shared slot computation -------------------------------------------------
const WORK_START_HOUR = 9; // 9:00
const WORK_END_HOUR = 17; // 17:00
const PRIORITY_END_HOUR = 12; // investor priority windows in the morning

function overlaps(a: Slot, b: BusyBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

export function computeSlots(
  range: TimeRange,
  busy: BusyBlock[],
  rules: SlotRules,
  now: Date
): Slot[] {
  const slots: Slot[] = [];
  const earliest = new Date(now.getTime() + rules.leadTimeHours * 3600_000);
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < range.end) {
    const day = cursor.getDay();
    const isWeekday = day >= 1 && day <= 5;
    if (isWeekday) {
      const endHour = rules.priority ? PRIORITY_END_HOUR : WORK_END_HOUR;
      for (let h = WORK_START_HOUR; h < endHour; h++) {
        for (let mm = 0; mm < 60; mm += rules.slotMinutes) {
          const start = new Date(cursor);
          start.setHours(h, mm, 0, 0);
          const end = new Date(start.getTime() + rules.slotMinutes * 60_000);
          if (end.getHours() > WORK_END_HOUR || (end.getHours() === WORK_END_HOUR && end.getMinutes() > 0)) {
            continue;
          }
          if (start < earliest) continue;
          if (start < range.start || end > range.end) continue;
          const slot = { start, end };
          if (busy.some((b) => overlaps(slot, b))) continue;
          slots.push(slot);
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

// --- Mock --------------------------------------------------------------------
function hashDate(d: Date): number {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

class MockCalendarProvider implements CalendarProvider {
  async getFreeBusy(range: TimeRange): Promise<BusyBlock[]> {
    // Deterministic busy blocks per weekday: a standing morning block, lunch,
    // and a date dependent afternoon block, so availability is realistic but
    // stable across runs.
    const blocks: BusyBlock[] = [];
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < range.end) {
      const day = cursor.getDay();
      if (day >= 1 && day <= 5) {
        const h = hashDate(cursor);
        const mk = (sh: number, sm: number, eh: number, em: number) => {
          const s = new Date(cursor);
          s.setHours(sh, sm, 0, 0);
          const e = new Date(cursor);
          e.setHours(eh, em, 0, 0);
          return { start: s, end: e };
        };
        blocks.push(mk(9, 0, 10, 0)); // standing morning sync
        blocks.push(mk(12, 0, 13, 0)); // lunch
        // date dependent afternoon block
        const startH = 13 + (h % 3); // 13, 14, or 15
        blocks.push(mk(startH, 30, startH + 1, 30));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return blocks.filter((b) => b.end > range.start && b.start < range.end);
  }

  async getAvailableSlots(range: TimeRange, rules: SlotRules): Promise<Slot[]> {
    const busy = await this.getFreeBusy(range);
    return computeSlots(range, busy, rules, new Date());
  }

  async createBooking(slot: Slot, details: BookingDetails): Promise<{ id: string }> {
    // eslint-disable-next-line no-console
    console.log(
      `[mock calendar] would create event "${details.summary}" ${slot.start.toISOString()} -> ${slot.end.toISOString()}`
    );
    return { id: `mock-event-${slot.start.getTime()}` };
  }
}

// --- Google ------------------------------------------------------------------
class GoogleCalendarProvider implements CalendarProvider {
  private async accessToken(): Promise<string> {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(env.google.clientId, env.google.clientSecret);
    client.setCredentials({ refresh_token: env.google.refreshToken });
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("Could not obtain Google access token");
    return token;
  }

  async getFreeBusy(range: TimeRange): Promise<BusyBlock[]> {
    const token = await this.accessToken();
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        items: [{ id: env.google.calendarId }],
      }),
    });
    if (!res.ok) throw new Error(`Google freeBusy failed: ${res.status}`);
    const data = await res.json();
    const cal = data.calendars?.[env.google.calendarId];
    return (cal?.busy ?? []).map((b: { start: string; end: string }) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));
  }

  async getAvailableSlots(range: TimeRange, rules: SlotRules): Promise<Slot[]> {
    const busy = await this.getFreeBusy(range);
    return computeSlots(range, busy, rules, new Date());
  }

  async createBooking(slot: Slot, details: BookingDetails): Promise<{ id: string }> {
    const token = await this.accessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.google.calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: details.summary,
          description: details.description,
          start: { dateTime: slot.start.toISOString() },
          end: { dateTime: slot.end.toISOString() },
          attendees: details.attendeeEmail ? [{ email: details.attendeeEmail }] : undefined,
        }),
      }
    );
    if (!res.ok) throw new Error(`Google event insert failed: ${res.status}`);
    const data = await res.json();
    return { id: data.id };
  }
}

let cached: CalendarProvider | null = null;

export function getCalendarProvider(): CalendarProvider {
  if (cached) return cached;
  cached =
    env.providers.calendar === "real"
      ? new GoogleCalendarProvider()
      : new MockCalendarProvider();
  return cached;
}
