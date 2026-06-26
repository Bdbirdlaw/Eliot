import { requireExperience } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { propertyWhere, maintenanceReportWhere } from "@/lib/scope";
import { LaneHeader } from "@/components/LaneHeader";
import { IntakeForm } from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function ContractorPage() {
  const { user, scope } = await requireExperience("contractor");

  // Scoped reads only. Properties come from the Property Management workstream;
  // reports are limited to what this contractor filed.
  const properties = await prisma.property.findMany({
    where: propertyWhere(scope),
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
  const mine = await prisma.maintenanceReport.findMany({
    where: maintenanceReportWhere(scope),
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, issue: true, bucket: true, status: true, createdAt: true },
  });

  return (
    <div className="min-h-screen bg-paper">
      <LaneHeader lane="Maintenance" userName={user.name} />
      <main className="mx-auto max-w-xl px-5 py-8 sm:px-8">
        <p className="numeral mb-2">Property operations</p>
        <h1 className="text-display-md">Maintenance intake</h1>
        <p className="mt-3 text-gray-mut">
          Submit an issue for triage. Most are resolved on submission, without
          principal involvement.
        </p>

        <div className="mt-8">
          <IntakeForm properties={properties} />
        </div>

        {mine.length > 0 && (
          <section className="mt-12">
            <p className="eyebrow mb-3">Recent submissions</p>
            <ul className="divide-y divide-gray-rule border-y border-gray-rule">
              {mine.map((r) => {
                const chip =
                  r.bucket === "auto"
                    ? "chip-go"
                    : r.bucket === "escalate"
                    ? "chip-stop"
                    : "chip-hold";
                return (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <span className="pr-4 text-sm">{r.issue}</span>
                    <span className={chip}>{r.status}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
