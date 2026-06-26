import { notFound } from "next/navigation";
import { requireFamily } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { workstreamWhere } from "@/lib/scope";
import { getAvailability } from "@/lib/booking";
import { FAMILY_IDS, type FamilyId } from "@/lib/constants";
import { LaneHeader } from "@/components/LaneHeader";
import { BookingPanel } from "@/components/BookingPanel";

export const dynamic = "force-dynamic";

// The family experience is ONE template, instantiated per family_id. Access is
// sealed by requireFamily: a member of one room can never reach the other.
export default async function FamilyRoom({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId: raw } = await params;
  const familyId = raw.toUpperCase() as FamilyId;
  if (!FAMILY_IDS.includes(familyId)) notFound();

  const { user, scope } = await requireFamily(familyId);

  const workstreams = await prisma.workstream.findMany({
    where: workstreamWhere(scope),
    include: { properties: true },
    orderBy: { name: "asc" },
  });
  const slots = await getAvailability("family_member");

  return (
    <div className="min-h-screen bg-paper-raised">
      <LaneHeader lane={`Family office ${familyId}`} userName={user.name} />
      <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10 lg:py-24">
        <p className="numeral mb-6 text-gray-mut">Private mandate</p>
        <h1 className="max-w-3xl font-display text-display-lg italic">
          Your holdings, under management.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
          A complete view of the assets we manage on your behalf, their
          reporting, and direct access to the principal.
        </p>

        <section className="mt-20">
          <p className="numeral mb-6 text-gray-mut">Holdings</p>
          <div className="space-y-12">
            {workstreams.length === 0 && (
              <p className="text-gray-mut">
                Holdings appear here once assigned to your mandate.
              </p>
            )}
            {workstreams.map((w) => (
              <div key={w.id}>
                <h2 className="font-display text-3xl">{w.name}</h2>
                {w.notes && <p className="mt-2 text-ink-soft">{w.notes}</p>}
                <ul className="mt-4 space-y-1 text-gray-mut">
                  {w.properties.map((p) => (
                    <li key={p.id}>
                      {p.label}
                      {p.address ? `, ${p.address}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 max-w-xl">
          <p className="numeral mb-6 text-gray-mut">Principal access</p>
          <h2 className="font-display text-3xl">On the nearest available window</h2>
          <p className="mt-3 text-gray-mut">
            Sessions of approximately one hour, confirmed on selection.
          </p>
          <div className="mt-8">
            <BookingPanel slots={slots} note="Select any available window. Confirmed on selection." />
          </div>
        </section>
      </main>
    </div>
  );
}
