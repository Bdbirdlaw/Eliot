"use client";

import { useState } from "react";

// Seeded identities for the development sign in shortcut. These mirror
// prisma/seed.ts and are only rendered when DEV_AUTH_SHORTCUT is on.
const DEV_USERS = [
  { email: "marcus@rivera-trades.example", label: "Marcus, contractor" },
  { email: "dana@tenant.example", label: "Dana, tenant" },
  { email: "priya@silverstar.example", label: "Priya, investor (Fund)" },
  { email: "whitfield@familya.example", label: "Helen, Family A" },
  { email: "ashford@familyb.example", label: "James, Family B" },
  { email: "eliot@eliotos.example", label: "Eliot (all lanes + Console)" },
  { email: "operator@eliotos.example", label: "Operator (Console)" },
];

export function SignInPanel({ devEnabled }: { devEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        return;
      }
      setStatus("sent");
      setDevLink(data.devLink ?? null);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={requestLink} className="space-y-3">
        <label className="label" htmlFor="email">
          Sign in
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="field"
        />
        <button type="submit" className="btn-ink w-full" disabled={status === "sending"}>
          {status === "sending" ? "Sending" : "Send sign in link"}
        </button>
      </form>

      {status === "sent" && (
        <p className="mt-3 text-sm text-gray-mut">
          If that address is provisioned, a one time link is on its way. It expires
          in thirty minutes.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-stop">Enter a valid email and try again.</p>
      )}
      {devLink && (
        <a href={devLink} className="mt-3 block break-all text-sm text-accent underline">
          Development link: click to sign in
        </a>
      )}

      {devEnabled && (
        <div className="mt-8">
          <p className="eyebrow mb-3">Development sign in</p>
          <div className="grid grid-cols-1 gap-2">
            {DEV_USERS.map((u) => (
              <form key={u.email} action="/api/auth/dev" method="post">
                <input type="hidden" name="email" value={u.email} />
                <button type="submit" className="btn-ghost w-full justify-start text-left">
                  {u.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
