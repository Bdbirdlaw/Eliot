import { prisma } from "@/lib/prisma";
import { sortByRubric } from "@/lib/rubric";
import { resolveReport } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsoleMaintenance() {
  const open = await prisma.maintenanceReport.findMany({
    where: { status: { in: ["queued", "escalated"] } },
    include: { workstream: true, reporter: true },
  });

  // Sorted by Eliot's rubric. People priority stays private and is not shown.
  const reports = sortByRubric(open, (r) => ({
    moneyAtRisk: r.hasQuote ? r.amount : null,
    hardDeadline: r.canWait ? null : r.createdAt,
    someoneWaiting: true,
    createdAt: r.createdAt,
  }));

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Oversight</p>
      <h1 className="text-2xl text-night-paper">Maintenance queue</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Ordered by the prioritization rubric: capital at risk, hard deadlines,
        then time. Daily approval runs through the principal&apos;s existing flow.
        This view is for oversight and closeout.
      </p>

      <div className="mt-8 space-y-px overflow-hidden border border-night-rule bg-night-rule">
        {reports.length === 0 && (
          <p className="bg-night-raised p-6 text-night-mut">The queue is clear.</p>
        )}
        {reports.map((r) => (
          <div key={r.id} className="bg-night-raised p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={r.status === "escalated" ? "chip-stop" : "chip-hold"}>
                    {r.status}
                  </span>
                  <span className="text-xs text-night-mut">{r.workstream.name}</span>
                </div>
                <p className="mt-2 text-night-paper">{r.issue}</p>
                {r.summary && <p className="mt-1 text-sm text-night-mut">{r.summary}</p>}
                {r.recommendation && (
                  <p className="mt-1 text-sm text-night-mut">
                    Recommendation: {r.recommendation}
                  </p>
                )}
                <p className="mt-2 text-xs text-night-mut">
                  {r.hasQuote && r.amount != null ? `Quote $${r.amount}` : "No quote"} ·{" "}
                  Reported by {r.reporter.name} · via {r.decisionSource}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {r.photoUrl && (
                  <a href={r.photoUrl} target="_blank" className="text-sm text-accent underline">
                    Photo
                  </a>
                )}
                <form action={resolveReport}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="btn-ghost border-night-rule text-night-paper">
                    Mark resolved
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
