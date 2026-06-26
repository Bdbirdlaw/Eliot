# Eliot OS

The outward facing layer of a private operating system for Eliot Silverman, a
Nashville real estate principal. Each audience transacts with Eliot the system
rather than interrupting Eliot the person: his judgment becomes triage, his
availability becomes booking, his voice becomes drafted communication.

This app is the outward face, not the brain. The Obsidian vault, maintained by
ProxyClaw, is the system of record for workstreams, deals, properties, tasks,
and meetings. This app keeps only its own operational state (accounts, sessions,
bookings, email drafts, maintenance reports, provider config) and hands new
canonical maintenance events to the vault inbox for ProxyClaw to reconcile.

A standing copy rule applies everywhere a visitor can read: no hyphens, no en
dashes, no em dashes. Code identifiers, model strings, field names, and file
paths stay exact.

## Quick start (runs fully on mock data, no credentials)

```bash
cd eliot-os
cp .env.example .env        # defaults are all mock; safe to leave as is
npm install                 # see "Prisma engines behind a proxy" if this fails
npm run setup               # prisma generate + db push + seed
npm run dev                 # http://localhost:3000
```

On the sign in page, use the development sign in shortcut to enter as any seeded
person. The shortcut is gated by `DEV_AUTH_SHORTCUT` and must be off in any
shared environment.

## Seed users

One person per role. Sign in with the dev shortcut, or request a magic link
(printed to the server console by the mock email provider, and also surfaced on
the sign in page in dev).

| Person          | Email                          | Role          | Lands on        |
| --------------- | ------------------------------ | ------------- | --------------- |
| Marcus Rivera   | marcus@rivera-trades.example   | contractor    | Handyman        |
| Dana Cole       | dana@tenant.example            | tenant        | Handyman        |
| Priya Nair      | priya@silverstar.example       | investor      | Fund            |
| Helen Whitfield | whitfield@familya.example      | family_member | Family office A |
| James Ashford   | ashford@familyb.example        | family_member | Family office B |
| Eliot Silverman | eliot@eliotos.example          | eliot         | Operator Console|
| Operations      | operator@eliotos.example       | operator      | Operator Console|

Also seeded: the seven real workstreams (JCE Owner LLC, DB17LP Owner LLC, 98
Volunteer Drive, The Bend, Project Secondhand, Dry Cleaning, Property
Management), all with NO lane assigned on purpose. Eliot assigns each in the
Operator Console under Workstreams. Property Management feeds the Handyman.

## The four experiences plus the console

- **Contractor and Maintenance portal** (`/contractor`): file a maintenance
  report, get instant triage. The front line. Most issues resolve without Eliot.
- **Portfolio** (`/portfolio`): the outward property book and the read side of
  the maintenance loop. Reached by Eliot and the operator.
- **Fund, Silver Star** (`/fund`): investor deal updates, reporting, priority
  booking.
- **Family offices** (`/family/A`, `/family/B`): two fully sealed rooms, one per
  family, white glove.
- **Operator Console** (`/console`): administration only. Access, workstream to
  lane assignment, booking rule tuning, provider config, and the outbound email
  approval queue. Not a daily brief.

After sign in the user is routed straight to their scoped lane. No chooser lists
lanes they cannot enter.

## Confidentiality walls (enforced at the data layer)

Walls are scoped queries that physically cannot return out of scope rows, not
front end filtering. See `src/lib/scope.ts`: every scoped read takes a `Scope`
derived from the session and folds the wall into the Prisma `where`. A scope
that cannot resolve a lane collapses to a clause that matches zero rows (fail
closed). Page guards in `src/lib/guard.ts` redirect out of scope users before
any data is read. Family A and Family B are sealed from each other and from the
fund and portfolio lanes.

People priority (`PeoplePriority`) is private. It feeds only tier 3 of the
rubric (`src/lib/rubric.ts`) and is never exposed by any external endpoint or
rendered as a label, tier, or score.

## Environment flags

All in `.env` (see `.env.example`). The app runs on mock with none of the real
secrets set. Secrets are read only on the server (`src/lib/env.ts`, guarded by
`server-only`) and never shipped to the browser.

| Variable                        | Meaning                                                |
| ------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                  | SQLite locally. Swap for a Postgres URL with no code change. |
| `AUTH_SECRET`                   | Signs the session cookie. Required.                    |
| `DEV_AUTH_SHORTCUT`             | `true` enables one click dev sign in. Off in prod.     |
| `APP_URL`                       | Base URL used in magic links and notifications.        |
| `MODEL_PROVIDER`                | `mock` or `real` (Anthropic).                          |
| `EMAIL_PROVIDER`                | `mock` or `real` (Resend).                             |
| `CALENDAR_PROVIDER`             | `mock` or `real` (Google Calendar).                    |
| `VAULT_SINK`                    | `mock` (local folder) or `real` (synced vault path).   |
| `NOTIFY_PROVIDER`               | `mock` or `real` (Resend or SMS).                      |
| `ANTHROPIC_API_KEY`             | Required when `MODEL_PROVIDER=real`.                   |
| `RESEND_API_KEY`, `EMAIL_FROM`  | Required when email or notify is real.                 |
| `GOOGLE_*`                      | Server side OAuth for Google Calendar.                 |
| `VAULT_INBOX_PATH`              | Absolute path to the vault inbox when `VAULT_SINK=real`.|
| `ELIOT_NOTIFY_EMAIL`            | Where escalations go when notify is real.              |
| `TRIAGE_AUTO_APPROVE_THRESHOLD` | Dollars. Auto approve at or under this when it can wait. Default 500. |

## The vault handoff contract (confirm with ProxyClaw before going live)

The Handyman never writes the canonical tracker file (two writers on one file
cause sync conflicts). It writes append only event files into a dedicated vault
inbox folder. ProxyClaw's agent is the sole reader and reconciles them into the
Property Management workstream of the canonical tracker.

- Mock writes to `eliot-os/vault_inbox/handyman/` (gitignored).
- Real writes to `VAULT_INBOX_PATH` inside the synced Obsidian vault, for
  example `.../vault/_inbox/handyman/`.
- One file per event, never edited in place. Name:
  `<UTC-stamp>__<reportId>__<kind>.md` where kind is `logged`, `queued`, or
  `escalated`.
- Each file is YAML frontmatter (machine reconcilable) plus a short human note.
  Frontmatter keys: `source`, `type`, `event`, `report_id`, `workstream`,
  `bucket`, `status`, `decision_source`, `safety_affected`, `has_quote`,
  `amount`, `can_wait`, `photo`, `no_photo_reason`, `reporter_name`,
  `reporter_email`, `created_at`.

The shape lives in `src/lib/providers/vault.ts` (`renderEventFile`). Confirm it
with ProxyClaw, then set `VAULT_SINK=real` and `VAULT_INBOX_PATH`.

## Triage logic (the Handyman)

Server side, in `src/lib/triage.ts`:

1. Hard rule, in code: safety or habitability affected => escalate.
2. Escape hatch: no photo possible => straight to the queue.
3. Hard rule, in code: a quote at or under the threshold that can wait => auto
   approve, log, clear the contractor.
4. Otherwise the model classifies (`claude-sonnet-4-6`, photo as a vision input,
   photo authoritative). Returns `auto`, `queue`, or `escalate` with a summary
   and recommendation.
5. Safety nets: never auto over the threshold or without a quote; downgrade to
   the queue. Any parse or model failure defaults to the queue (fail safe toward
   the human).

Queue order follows the rubric: money, hard deadlines, who is waiting (private
people priority weighting), then time.

## Booking

`src/lib/booking.ts` against a `CalendarProvider`. Availability always excludes
busy time, and a requested slot is re checked at confirm time so an overlap can
never slip through. Per role rules are `BookingRule` records, tunable in the
console: contractor and tenant 15 minutes, 48 hour lead, approval required;
investor 30 minutes, 24 hour lead, light approval, priority windows; family 60
minutes, 12 hour lead, instant. Eliot and operator bypass the rules.

## Email (draft and approve)

`src/lib/email-service.ts`. High stakes lanes (fund, family) are always held as
drafts for approval in the console. Only whitelisted routine templates in the
contractor or portfolio lane may auto send. Resend is just the pipe.

## Wiring each real provider (exact files to touch)

No feature code changes, only provider swaps. For each, flip the flag in `.env`,
set the matching secret, and the factory returns the real implementation.

| Provider | Flag | Secrets | File to edit if needed |
| -------- | ---- | ------- | ---------------------- |
| Model (triage, drafting) | `MODEL_PROVIDER=real` | `ANTHROPIC_API_KEY` | `src/lib/providers/model.ts` (`AnthropicModelProvider`) |
| Email | `EMAIL_PROVIDER=real` | `RESEND_API_KEY`, `EMAIL_FROM` | `src/lib/providers/email.ts` (`ResendEmailProvider`) |
| Calendar | `CALENDAR_PROVIDER=real` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` | `src/lib/providers/calendar.ts` (`GoogleCalendarProvider`) |
| Vault sink | `VAULT_SINK=real` | `VAULT_INBOX_PATH` | `src/lib/providers/vault.ts` (`FsVaultSink`) |
| Notify | `NOTIFY_PROVIDER=real` | `RESEND_API_KEY`, `ELIOT_NOTIFY_EMAIL` | `src/lib/providers/notify.ts` (`EmailNotifyProvider`) |

## Moving to Postgres

Change `datasource db { provider }` in `prisma/schema.prisma` to `postgresql`
and point `DATABASE_URL` at Postgres, then `npm run db:push`. The schema avoids
SQLite only features; enum like fields are validated strings in
`src/lib/constants.ts`.

## Scripts

- `npm run dev` start the dev server
- `npm run build` prisma generate then next build
- `npm run setup` generate, push schema, seed
- `npm run db:reset` drop the local db, push, reseed
- `npm run db:seed` reseed

## Prisma engines behind a proxy

If `npm install` cannot download Prisma engines (some networks reset the
binaries host), install with `npm install --ignore-scripts`, then fetch the two
engines for your platform with curl and point Prisma at them:

```bash
HASH=$(node -e "console.log(require('@prisma/engines-version').enginesVersion)")
TARGET=$(node -e "require('@prisma/get-platform').getBinaryTargetForCurrentPlatform().then(t=>console.log(t))")
BASE="https://binaries.prisma.sh/all_commits/$HASH/$TARGET"
DEST=node_modules/@prisma/engines
curl -fsSL "$BASE/libquery_engine.so.node.gz" | gunzip > "$DEST/libquery_engine-$TARGET.so.node"
curl -fsSL "$BASE/schema-engine.gz" | gunzip > "$DEST/schema-engine-$TARGET" && chmod +x "$DEST/schema-engine-$TARGET"
```

`prisma generate` then copies the query engine next to the client, so the dev
server and build run without further downloads.

## What this app is not

No second source of truth for workstreams, deals, tasks, or meetings. No daily
command center or brief. No direct writes to the canonical tracker. No auto send
to investor or family lanes. No people priority rendered anywhere external. No
cross scope or cross family access. No secrets on the client. No call recording.
