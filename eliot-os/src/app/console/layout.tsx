import { requireAdmin } from "@/lib/guard";
import { LaneHeader } from "@/components/LaneHeader";

const NAV = [
  { href: "/console", label: "Overview" },
  { href: "/console/maintenance", label: "Maintenance" },
  { href: "/console/email", label: "Email queue" },
  { href: "/console/journeys", label: "Journeys" },
  { href: "/console/bookings", label: "Bookings" },
  { href: "/console/workstreams", label: "Workstreams" },
  { href: "/console/users", label: "Access" },
  { href: "/console/booking-rules", label: "Booking rules" },
  { href: "/console/providers", label: "Providers" },
];

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only eliot and operator reach the console. Everyone else is bounced.
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-night text-night-paper">
      <LaneHeader lane="Operator Console" userName={user.name} tone="paper" />
      <div className="mx-auto flex max-w-editorial flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <nav className="lg:w-48 lg:shrink-0">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col lg:gap-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="text-sm text-night-mut hover:text-night-paper"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
