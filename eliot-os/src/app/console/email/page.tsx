import { prisma } from "@/lib/prisma";
import { approveEmail, discardEmail, editEmail } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsoleEmail() {
  const drafts = await prisma.emailDraft.findMany({
    where: { status: "draft" },
    orderBy: { createdAt: "desc" },
  });
  const recent = await prisma.emailDraft.findMany({
    where: { status: { in: ["sent", "discarded"] } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Draft and approve</p>
      <h1 className="text-2xl text-night-paper">Outbound correspondence</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        High stakes lanes are never sent without review. Approve, edit, or discard
        before delivery. Routine whitelisted templates in the contractor and
        portfolio lanes send automatically and appear below.
      </p>

      <div className="mt-8 space-y-4">
        {drafts.length === 0 && (
          <p className="border border-night-rule bg-night-raised p-6 text-night-mut">
            Nothing waiting for approval.
          </p>
        )}
        {drafts.map((d) => (
          <div key={d.id} className="border border-night-rule bg-night-raised p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-label text-night-mut">
                {d.lane} lane
              </span>
              <span className="text-xs text-night-mut">to {d.toEmail}</span>
            </div>
            <p className="mt-2 font-display text-lg text-night-paper">{d.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-night-mut">
              {d.body}
            </pre>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <form action={approveEmail}>
                <input type="hidden" name="draftId" value={d.id} />
                <button className="btn-accent">Approve and send</button>
              </form>
              <form action={discardEmail}>
                <input type="hidden" name="draftId" value={d.id} />
                <button className="btn-ghost border-night-rule text-night-paper">
                  Discard
                </button>
              </form>
              <details className="w-full">
                <summary className="cursor-pointer text-sm text-accent">Edit</summary>
                <form action={editEmail} className="mt-3 space-y-2">
                  <input type="hidden" name="draftId" value={d.id} />
                  <input
                    name="subject"
                    defaultValue={d.subject}
                    className="field bg-night text-night-paper"
                  />
                  <textarea
                    name="body"
                    defaultValue={d.body}
                    rows={6}
                    className="field bg-night text-night-paper"
                  />
                  <button className="btn-ghost border-night-rule text-night-paper">
                    Save edits
                  </button>
                </form>
              </details>
            </div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <section className="mt-12">
          <p className="eyebrow mb-3 text-night-mut">Recent</p>
          <ul className="divide-y divide-night-rule border-y border-night-rule">
            {recent.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-night-paper">{d.subject}</span>
                <span className="text-night-mut">
                  {d.status}
                  {d.autoSendEligible ? " · auto" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
