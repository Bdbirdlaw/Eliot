import { prisma } from "@/lib/prisma";
import { approveBookingReq, declineBookingReq } from "../actions";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ConsoleBookings() {
  const requests = await prisma.booking.findMany({
    where: { status: "requested" },
    include: { user: true },
    orderBy: { start: "asc" },
  });
  const upcoming = await prisma.booking.findMany({
    where: { status: "confirmed", start: { gte: new Date() } },
    include: { user: true },
    orderBy: { start: "asc" },
    take: 12,
  });

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Calendar</p>
      <h1 className="text-2xl text-night-paper">Bookings</h1>
      <p className="mt-2 text-sm text-night-mut">
        Contractor and tenant requests require approval. Limited partner and
        family windows confirm on selection.
      </p>

      <section className="mt-8">
        <p className="eyebrow mb-3 text-night-mut">Requests</p>
        <div className="space-y-px overflow-hidden border border-night-rule bg-night-rule">
          {requests.length === 0 && (
            <p className="bg-night-raised p-5 text-night-mut">No pending requests.</p>
          )}
          {requests.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-night-raised p-5"
            >
              <div>
                <p className="text-night-paper">{fmt(b.start)}</p>
                <p className="text-sm text-night-mut">
                  {b.user.name} · {b.experience} lane
                  {b.notes ? ` · ${b.notes}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <form action={approveBookingReq}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="btn-accent">Approve</button>
                </form>
                <form action={declineBookingReq}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="btn-ghost border-night-rule text-night-paper">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="eyebrow mb-3 text-night-mut">Upcoming confirmed</p>
        <ul className="divide-y divide-night-rule border-y border-night-rule">
          {upcoming.length === 0 && (
            <li className="py-3 text-sm text-night-mut">Nothing on the calendar yet.</li>
          )}
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-night-paper">{fmt(b.start)}</span>
              <span className="text-night-mut">
                {b.user.name} · {b.experience}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
