import { requireExperience } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { workstreamWhere } from "@/lib/scope";
import { getAvailability } from "@/lib/booking";
import { LaneHeader } from "@/components/LaneHeader";
import { BookingPanel } from "@/components/BookingPanel";

export const dynamic = "force-dynamic";

export default async function FundPage() {
  const { user, scope } = await requireExperience("fund");

  const workstreams = await prisma.workstream.findMany({
    where: workstreamWhere(scope),
    orderBy: { name: "asc" },
  });
  const slots = await getAvailability("investor");

  // Reporting documents would be scoped per investor against a document store.
  // Shown here as the report shelf the lane exposes.
  const documents = [
    { name: "Silver Star quarterly letter", meta: "PDF" },
    { name: "Capital account statement", meta: "PDF" },
    { name: "Portfolio mark schedule", meta: "XLSX" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <LaneHeader lane="Silver Star" userName={user.name} />
      <main className="mx-auto max-w-editorial px-5 py-12 sm:px-8 lg:py-20">
        <p className="numeral mb-4">Silver Star / Limited Partner</p>
        <h1 className="max-w-3xl text-display-lg">
          Your interest in Silver Star.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Reporting, capital activity, and direct access to the principal, scoped
          to your commitment in the eighty million dollar fund.
        </p>

        <div className="mt-16 grid gap-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <section>
              <p className="numeral mb-3">01 / Portfolio activity</p>
              <div className="divide-y divide-gray-rule border-y border-gray-rule">
                {workstreams.length === 0 && (
                  <p className="py-6 text-gray-mut">
                    No workstreams are assigned to the fund lane yet.
                  </p>
                )}
                {workstreams.map((w) => (
                  <div key={w.id} className="py-5">
                    <p className="font-display text-xl">{w.name}</p>
                    <p className="mt-1 text-sm text-gray-mut">
                      {w.notes ?? "Active position in the Silver Star book."}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <p className="numeral mb-3">02 / Reporting</p>
              <ul className="divide-y divide-gray-rule border-y border-gray-rule">
                {documents.map((d) => (
                  <li key={d.name} className="flex items-center justify-between py-4">
                    <span>{d.name}</span>
                    <span className="font-mono text-xs uppercase tracking-label text-gray-mut">
                      {d.meta}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside>
            <div className="card p-6 sm:p-8">
              <p className="numeral mb-2">03 / Principal access</p>
              <h2 className="text-2xl">Request time</h2>
              <p className="mt-2 text-sm text-gray-mut">
                Thirty minute sessions. Priority windows. Confirmed on review.
              </p>
              <div className="mt-6">
                <BookingPanel slots={slots} />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
