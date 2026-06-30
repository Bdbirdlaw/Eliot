// Resolve a Postgres connection string regardless of the exact env var name.
//
// The Prisma schema reads env("DATABASE_URL"). Hosted Postgres integrations do
// not always provide that exact name: a Neon integration on Vercel, for
// example, prefixes every variable with the store name, so the URL arrives as
// Eliot_DATABASE_URL, Eliot_DATABASE_URL_UNPOOLED, Eliot_POSTGRES_URL, and so
// on. This finds the right one by suffix, so it works whatever the prefix is.
//
// A direct (unpooled) connection is preferred because prisma db push runs DDL,
// which the pooled PgBouncer endpoint cannot always serve.

type Env = Record<string, string | undefined>;

// Suffixes in priority order. Unpooled / non pooling first (best for db push),
// then the plain and pooled forms as fallbacks.
const SUFFIXES = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
];

export function resolveDatabaseUrl(env: Env): string | undefined {
  const keys = Object.keys(env);
  for (const suffix of SUFFIXES) {
    // Exact match (DATABASE_URL) or any prefixed match (Eliot_DATABASE_URL).
    const key =
      keys.find((k) => k === suffix) ??
      keys.find((k) => k.endsWith(`_${suffix}`));
    const value = key ? env[key] : undefined;
    if (value) return value;
  }
  return undefined;
}
