import { prisma } from "@/lib/prisma";
import { WORKSTREAM_LANES } from "@/lib/constants";
import { setWorkstreamLane } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsoleWorkstreams() {
  const workstreams = await prisma.workstream.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Assignment</p>
      <h1 className="text-2xl text-night-paper">Workstreams to lanes</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Assign each workstream to the lane it belongs in. They ship unassigned on
        purpose. Property Management feeds the Handyman regardless of its lane.
      </p>

      <div className="mt-8 space-y-px overflow-hidden border border-night-rule bg-night-rule">
        {workstreams.map((w) => (
          <form
            key={w.id}
            action={setWorkstreamLane}
            className="flex flex-wrap items-center justify-between gap-3 bg-night-raised p-4"
          >
            <div>
              <p className="text-night-paper">{w.name}</p>
              <p className="text-xs uppercase tracking-label text-night-mut">
                {w.experience ?? "unassigned"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input type="hidden" name="workstreamId" value={w.id} />
              <select
                name="experience"
                defaultValue={w.experience ?? ""}
                className="field bg-night text-night-paper"
              >
                <option value="">Unassigned</option>
                {WORKSTREAM_LANES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button className="btn-ghost border-night-rule text-night-paper">Save</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
