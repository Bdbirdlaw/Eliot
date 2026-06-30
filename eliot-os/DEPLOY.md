# Deploying Eliot OS to Vercel

The app is a Next.js app under `eliot-os/` backed by Postgres. It runs on mock
providers by default, so the only hard requirement to go live is a Postgres
database and a session secret. Follow these steps once.

## 1. Import the repository

1. Go to https://vercel.com/new and import `bdbirdlaw/eliot`.
2. **Root Directory:** set this to `eliot-os` (click Edit next to Root
   Directory and choose the folder). This is required, the app is not at the
   repo root.
3. Framework Preset is detected as Next.js. Leave Build and Install commands on
   their defaults: Vercel runs the `vercel-build` script, which generates the
   Prisma client, pushes the schema, seeds the database, then builds.

## 2. Add a Postgres database

In the project, open the **Storage** tab and create a Postgres database (Vercel
Postgres or the Neon integration). Attaching it sets `DATABASE_URL` on the
project automatically. If you bring your own Postgres, add `DATABASE_URL`
yourself under Settings, Environment Variables.

## 3. Set environment variables

Under Settings, Environment Variables (Production and Preview):

| Variable             | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`       | Injected by the Postgres integration, or your own Postgres URL. |
| `AUTH_SECRET`        | A long random string. Generate with `openssl rand -hex 32`. |
| `APP_URL`            | Your deployment URL, for example `https://eliot.vercel.app`. |
| `DEV_AUTH_SHORTCUT`  | `true` for a quick demo (one click sign in as any seeded user). Set to `false` once real email sign in is wired. See the warning below. |

Every provider flag (`MODEL_PROVIDER`, `EMAIL_PROVIDER`, `CALENDAR_PROVIDER`,
`VAULT_SINK`, `NOTIFY_PROVIDER`) defaults to `mock` when unset, so you do not
need to set any of them for the first deploy.

## 4. Deploy

Click Deploy. The first build creates the tables and seeds the demo data. Open
the deployment URL and sign in.

## Sign in and the DEV_AUTH_SHORTCUT warning

With `DEV_AUTH_SHORTCUT=true`, the sign in page exposes one click sign in as any
seeded person, including Eliot and the operator. That is convenient for a demo
but it means anyone with the URL can enter any lane, which defeats the
confidentiality walls. Two ways to lock it down:

- Wire real email sign in: set `EMAIL_PROVIDER=real`, add `RESEND_API_KEY` and
  `EMAIL_FROM`, then set `DEV_AUTH_SHORTCUT=false`. Magic links go out by email.
- Or keep the shortcut off and gate the whole deployment behind Vercel
  password protection or an allowlist while you evaluate.

## Going live on real providers

Each provider is a flag plus its keys. See `eliot-os/README.md` for the full
matrix (Anthropic for triage and drafting, Resend for email and notify, Google
Calendar for booking, a synced vault path for the Handyman handoff).

## Local development with Postgres

The schema now targets Postgres, so local dev needs a Postgres instance rather
than a file. Point `DATABASE_URL` at a local Postgres (for example via Docker)
and run `npm run setup`, which generates the client, pushes the schema, and
seeds.
