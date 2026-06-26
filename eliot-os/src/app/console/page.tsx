import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleOverview() {
  const [drafts, queued, escalated, requests] = await Promise.all([
    prisma.emailDraft.count({ where: { status: "draft" } }),
    prisma.maintenanceReport.count({ where: { status: "queued" } }),
    prisma.maintenanceReport.count({ where: { status: "escalated" } }),
    prisma.booking.count({ where: { status: "requested" } }),
  ]);

  const cards = [
    { label: "Correspondence to approve", value: drafts, href: "/console/email" },
    { label: "Maintenance queued", value: queued, href: "/console/maintenance" },
    { label: "Escalations open", value: escalated, href: "/console/maintenance" },
    { label: "Booking requests", value: requests, href: "/console/bookings" },
  ];

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Administration</p>
      <h1 className="text-display-md text-night-paper">Operator Console</h1>
      <p className="mt-3 max-w-2xl text-night-mut">
        Administration only. This is not a daily brief. Daily approvals run
        through the book of record and the principal&apos;s existing approval
        flow. Use this surface to manage access, tune rules, configure providers,
        and clear the outbound correspondence queue.
      </p>

      <div className="mt-10 grid gap-px overflow-hidden border border-night-rule bg-night-rule sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <a key={c.label} href={c.href} className="bg-night-raised p-6 hover:bg-night">
            <p className="font-mono text-4xl text-night-paper">{c.value}</p>
            <p className="mt-2 text-sm text-night-mut">{c.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
