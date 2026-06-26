import { prisma } from "@/lib/prisma";
import {
  runJourneysAction,
  enrollInJourneyAction,
  cancelEnrollmentAction,
} from "../actions";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "none";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ConsoleJourneys() {
  const journeys = await prisma.journey.findMany({
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: { include: { user: true }, orderBy: { enrolledAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Candidates to enroll: contractors and tenants not already enrolled anywhere.
  const enrolledUserIds = new Set(
    journeys.flatMap((j) => j.enrollments.map((e) => e.userId))
  );
  const candidates = (
    await prisma.user.findMany({
      where: { role: { in: ["contractor", "tenant"] }, active: true },
      orderBy: { name: "asc" },
    })
  ).filter((u) => !enrolledUserIds.has(u.id));

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Lifecycle</p>
      <h1 className="text-2xl text-night-paper">Nurture journeys</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Each step is written as a draft into the approval queue when it comes due.
        Nothing is sent without review. In production a scheduled job advances due
        steps; here you can run them on demand.
      </p>

      <form action={runJourneysAction} className="mt-5">
        <button className="btn-accent">Process due steps now</button>
      </form>

      {journeys.map((j) => {
        const total = j.steps.length;
        return (
          <section key={j.id} className="mt-10 border border-night-rule">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-night-rule bg-night-raised p-5">
              <div>
                <p className="font-display text-xl text-night-paper">{j.name}</p>
                <p className="text-xs uppercase tracking-label text-night-mut">
                  {j.audience} · {j.lane} lane · {total} steps
                </p>
              </div>
              <span className={j.active ? "chip-go" : "chip-hold"}>
                {j.active ? "active" : "paused"}
              </span>
            </div>

            <div className="grid gap-px bg-night-rule md:grid-cols-2">
              <div className="bg-night-raised p-5">
                <p className="eyebrow mb-3 text-night-mut">Sequence</p>
                <ol className="space-y-3">
                  {j.steps.map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-night-mut">
                          {s.order}. day {s.dayOffset}
                        </span>
                        <span className="text-night-paper">{s.subject}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-night-raised p-5">
                <p className="eyebrow mb-3 text-night-mut">Enrollments</p>
                <div className="space-y-2">
                  {j.enrollments.length === 0 && (
                    <p className="text-sm text-night-mut">No one enrolled yet.</p>
                  )}
                  {j.enrollments.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 border-b border-night-rule pb-2 text-sm last:border-0"
                    >
                      <div>
                        <p className="text-night-paper">{e.user.name}</p>
                        <p className="text-xs text-night-mut">
                          {e.status} · {e.currentStep}/{total} sent · next {fmt(e.nextRunAt)}
                        </p>
                      </div>
                      {e.status === "active" && (
                        <form action={cancelEnrollmentAction}>
                          <input type="hidden" name="enrollmentId" value={e.id} />
                          <button className="text-xs text-accent underline">Cancel</button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>

                <form action={enrollInJourneyAction} className="mt-4 flex items-center gap-2">
                  <input type="hidden" name="journeyKey" value={j.key} />
                  <select name="userId" className="field bg-night text-night-paper" required>
                    <option value="">Enroll someone</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn-ghost border-night-rule text-night-paper">Enroll</button>
                </form>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
