import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Read only view of provider wiring. Secrets are never shown, only the mode.
export default function ConsoleProviders() {
  const rows = [
    { name: "Model (triage and drafting)", mode: env.providers.model, real: "Anthropic claude-sonnet-4-6" },
    { name: "Email", mode: env.providers.email, real: "Resend" },
    { name: "Calendar", mode: env.providers.calendar, real: "Google Calendar" },
    { name: "Vault sink", mode: env.providers.vault, real: "Synced vault inbox" },
    { name: "Notify", mode: env.providers.notify, real: "Resend or SMS" },
  ];

  return (
    <div>
      <p className="numeral mb-2 text-night-mut">Configuration</p>
      <h1 className="text-2xl text-night-paper">Providers</h1>
      <p className="mt-2 max-w-2xl text-sm text-night-mut">
        Each integration runs behind an interface with a mock. Going live is a
        flag flip plus a secret on the server. No secret is ever shown here or
        shipped to the browser.
      </p>

      <div className="mt-8 overflow-hidden border border-night-rule">
        <table className="w-full text-left text-sm">
          <thead className="bg-night-raised text-night-mut">
            <tr>
              <th className="px-4 py-3 font-medium">Integration</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Real implementation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-night-rule">
                <td className="px-4 py-3 text-night-paper">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={r.mode === "real" ? "chip-go" : "chip-hold"}>{r.mode}</span>
                </td>
                <td className="px-4 py-3 text-night-mut">{r.real}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-night-mut">
        Auto approve threshold for the Handyman: ${env.triageAutoApproveThreshold}.
      </p>
    </div>
  );
}
