import "server-only";

/**
 * Server only access to configuration and secrets.
 *
 * Importing this file from a Client Component is a build error thanks to the
 * "server-only" guard above. Secrets (Anthropic, Resend, Google, vault path)
 * are read here and NEVER shipped to the browser. Nothing in this app is
 * prefixed NEXT_PUBLIC_.
 */

type ProviderMode = "mock" | "real";

function mode(name: string): ProviderMode {
  return process.env[name] === "real" ? "real" : "mock";
}

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  authSecret: process.env.AUTH_SECRET ?? "dev-only-insecure-secret",
  devAuthShortcut: process.env.DEV_AUTH_SHORTCUT === "true",
  // Shared secret a scheduler presents to advance nurture journeys.
  cronSecret: process.env.CRON_SECRET ?? "",

  providers: {
    model: mode("MODEL_PROVIDER"),
    email: mode("EMAIL_PROVIDER"),
    calendar: mode("CALENDAR_PROVIDER"),
    vault: mode("VAULT_SINK"),
    notify: mode("NOTIFY_PROVIDER"),
  },

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Eliot OS <ops@example.com>",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  },

  vaultInboxPath: process.env.VAULT_INBOX_PATH ?? "",
  eliotNotifyEmail: process.env.ELIOT_NOTIFY_EMAIL ?? "eliot@example.com",

  triageAutoApproveThreshold: Number(
    process.env.TRIAGE_AUTO_APPROVE_THRESHOLD ?? "500"
  ),
};
