import { requireExperience } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { workstreamWhere, maintenanceReportWhere } from "@/lib/scope";
import { sortByRubric } from "@/lib/rubric";
import { LaneHeader } from "@/components/LaneHeader";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const { user, scope } = await requireExperience("portfolio");

  const workstreams = await prisma.workstream.findMany({
    where: workstreamWhere(scope),
    include: { properties: true },
    orderBy: { name: "asc" },
  });

  const reportsRaw = await prisma.maintenanceReport.findMany({
    where: maintenanceReportWhere(scope),
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  // Sorted by Eliot's rubric (money, deadline, someone waiting, then time).
  const reports = sortByRubric(reportsRaw, (r) => ({
    moneyAtRisk: r.hasQuote ? r.amount : null,
    hardDeadline: r.canWait ? null : r.createdAt,
    someoneWaiting: true,
    createdAt: r.createdAt,
  }));

  return (
    <div className="min-h-screen bg-night bg-dot-grid-dark bg-dot text-night-paper">
      <LaneHeader lane="Portfolio" userName={user.name} tone="paper" />
      <main className="mx-auto max-w-editorial px-5 py-10 sm:px-8">
        <p className="numeral mb-2 text-night-mut">01 / Property book</p>
        <h1 className="text-display-md text-night-paper">Portfolio operations</h1>
        <p className="mt-3 max-w-2xl text-night-mut">
          A read view of the property book and its operating activity. The vault
          remains the book of record; this is not a second ledger.
        </p>

        <section className="mt-10 grid gap-px overflow-hidden border border-night-rule bg-night-rule sm:grid-cols-2 lg:grid-cols-3">
          {workstreams.length === 0 && (
            <div className="bg-night-raised p-6 text-night-mut">
              No workstreams are assigned to the portfolio lane yet. Assign them in
              the Operator Console.
            </div>
          )}
          {workstreams.map((w) => (
            <div key={w.id} className="bg-night-raised p-6">
              <p className="font-display text-xl text-night-paper">{w.name}</p>
              <p className="mt-1 text-xs uppercase tracking-label text-night-mut">
                {w.experience ?? "unassigned"}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-night-mut">
                {w.properties.map((p) => (
                  <li key={p.id}>{p.label}</li>
                ))}
                {w.properties.length === 0 && <li>No properties listed.</li>}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <p className="numeral mb-2 text-night-mut">02 / Maintenance activity</p>
          <h2 className="text-2xl text-night-paper">Maintenance activity</h2>
          <div className="mt-6 overflow-hidden border border-night-rule">
            <table className="w-full text-left text-sm">
              <thead className="bg-night-raised text-night-mut">
                <tr>
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t border-night-rule">
                    <td className="px-4 py-3">{r.issue}</td>
                    <td className="px-4 py-3 text-night-mut">
                      {r.hasQuote && r.amount != null ? `$${r.amount}` : "none"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.bucket === "auto"
                            ? "chip-go"
                            : r.bucket === "escalate"
                            ? "chip-stop"
                            : "chip-hold"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-night-mut" colSpan={3}>
                      No maintenance reports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
