import { prisma } from "@/lib/prisma";
import { updateBookingRule } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsoleBookingRules() {
  const rules = await prisma.bookingRule.findMany({ orderBy: { priority: "asc" } });

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Tuning</p>
      <h1 className="text-2xl text-night-paper">Booking rules</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Slot length, lead time, and whether a role needs approval. Computed on the
        server; the lanes read these.
      </p>

      <div className="mt-8 space-y-px overflow-hidden border border-night-rule bg-night-rule">
        {rules.map((r) => (
          <form
            key={r.role}
            action={updateBookingRule}
            className="grid grid-cols-2 items-end gap-3 bg-night-raised p-5 sm:grid-cols-6"
          >
            <input type="hidden" name="role" value={r.role} />
            <div className="col-span-2 sm:col-span-1">
              <p className="text-night-paper">{r.role}</p>
            </div>
            <label className="block text-xs text-night-mut">
              Slot minutes
              <input
                name="slotMinutes"
                type="number"
                defaultValue={r.slotMinutes}
                className="field mt-1 bg-night text-night-paper"
              />
            </label>
            <label className="block text-xs text-night-mut">
              Lead hours
              <input
                name="leadTimeHours"
                type="number"
                defaultValue={r.leadTimeHours}
                className="field mt-1 bg-night text-night-paper"
              />
            </label>
            <label className="block text-xs text-night-mut">
              Priority
              <input
                name="priority"
                type="number"
                defaultValue={r.priority}
                className="field mt-1 bg-night text-night-paper"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-night-mut">
              <input
                name="requiresApproval"
                type="checkbox"
                defaultChecked={r.requiresApproval}
              />
              Needs approval
            </label>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-night-mut">
                <input name="routeToTriage" type="checkbox" defaultChecked={r.routeToTriage} />
                To triage
              </label>
              <button className="btn-ghost border-night-rule text-night-paper">Save</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
