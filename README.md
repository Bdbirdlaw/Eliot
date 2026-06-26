# Eliot OS

The outward facing layer of a private operating system for Eliot Silverman, a
Nashville real estate principal. It productizes how Eliot runs his businesses so
that each audience transacts with Eliot the system rather than interrupting
Eliot the person.

This app is the outward face, not the brain. The Obsidian vault (maintained by
ProxyClaw) remains the system of record. The Handyman generates new canonical
maintenance events and hands them to a vault inbox for ProxyClaw to reconcile.

## Layout

- `eliot-os/` the Next.js application. Start here. See `eliot-os/README.md` for
  setup, seed users, environment flags, the vault handoff contract, and exactly
  which files to touch to wire each real provider.
- `vault_reference/maintenance_triage.html` the original browser prototype of
  the maintenance triage, ported into the app as the Handyman.

## Get running in one minute (mock data, no credentials)

```bash
cd eliot-os
cp .env.example .env
npm install
npm run setup
npm run dev
```

Then open http://localhost:3000 and use the development sign in shortcut.
