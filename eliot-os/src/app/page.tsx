import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignInPanel } from "@/components/SignInPanel";
import { Wordmark } from "@/components/Wordmark";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));

  return (
    <main className="min-h-screen bg-paper bg-dot-grid bg-dot">
      <div className="mx-auto max-w-editorial px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <Wordmark />
          <span className="eyebrow">Private platform</span>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-28">
          <div className="animate-fade-in">
            <p className="numeral mb-6">01 / Platform</p>
            <h1 className="text-display-xl font-display">
              A managed interface to the
              <span className="italic text-accent"> principal.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Eliot OS sits between the principal and his counterparties. Intake,
              scheduling, and correspondence run as software, scoped to each
              relationship and reconciled to the book of record.
            </p>

            <div className="mt-14 grid max-w-xl grid-cols-2 gap-px overflow-hidden border border-gray-rule bg-gray-rule">
              {[
                ["Contractor", "Maintenance intake and triage across the property book."],
                ["Portfolio", "The property book and its operating activity."],
                ["Fund", "Silver Star reporting, capital activity, and principal access."],
                ["Family", "Dedicated coverage for each family mandate."],
              ].map(([title, body]) => (
                <div key={title} className="bg-paper-raised p-5">
                  <p className="font-display text-lg">{title}</p>
                  <p className="mt-1 text-sm text-gray-mut">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start lg:justify-end">
            <div className="card w-full max-w-sm p-6 sm:p-8">
              <SignInPanel devEnabled={env.devAuthShortcut} />
            </div>
          </div>
        </section>

        <footer className="rule mt-10 flex items-center justify-between py-8 text-sm text-gray-mut">
          <span>Eliot OS</span>
          <span className="font-mono">Nashville</span>
        </footer>
      </div>
    </main>
  );
}
