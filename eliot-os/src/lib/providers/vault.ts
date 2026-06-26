import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { env } from "../env";

/**
 * VaultSink (section 0).
 *
 * The Handyman generates new CANONICAL events. It must NOT write the canonical
 * tracker file directly: two writers on one file create sync conflicts. Instead
 * it writes APPEND ONLY event files (markdown + frontmatter) into a dedicated
 * vault inbox folder. ProxyClaw's agent is the sole writer of the canonical
 * tracker and reconciles these files into the Property Management workstream.
 *
 * Mock writes to ./vault_inbox/handyman in the repo. Real writes into the
 * synced vault path (VAULT_INBOX_PATH). Confirm the file contract below with
 * ProxyClaw before pointing VAULT_SINK=real at the live vault.
 */

export type HandymanEventKind = "logged" | "queued" | "escalated" | "resolved";

export type HandymanEvent = {
  kind: HandymanEventKind;
  reportId: string;
  workstream: string;
  bucket: "auto" | "queue" | "escalate" | null;
  status: string;
  issue: string;
  safetyAffected: boolean;
  hasQuote: boolean;
  amount: number | null;
  canWait: boolean;
  summary: string | null;
  recommendation: string | null;
  decisionSource: string | null;
  photoUrl: string | null;
  noPhotoReason: string | null;
  reporterName: string;
  reporterEmail: string;
  createdAtISO: string;
};

export interface VaultSink {
  writeHandymanEvent(event: HandymanEvent): Promise<{ path: string }>;
}

// ---------------------------------------------------------------------------
// Event file contract (CONFIRM WITH PROXYCLAW BEFORE WIRING THE REAL PATH).
//
// Path:  <inbox>/handyman/<UTC-stamp>__<reportId>__<kind>.md
// Body:  YAML frontmatter (machine reconcilable) + a short human readable note.
// These files are APPEND ONLY: one file per event, never edited in place.
// ---------------------------------------------------------------------------

function yamlValue(v: string | number | boolean | null): string {
  if (v === null) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  // Quote and escape strings so newlines and colons cannot break the frontmatter.
  return JSON.stringify(v);
}

function renderEventFile(e: HandymanEvent): string {
  const fm: Record<string, string | number | boolean | null> = {
    source: "eliot-os",
    type: "handyman_event",
    event: e.kind,
    report_id: e.reportId,
    workstream: e.workstream,
    bucket: e.bucket,
    status: e.status,
    decision_source: e.decisionSource,
    safety_affected: e.safetyAffected,
    has_quote: e.hasQuote,
    amount: e.amount,
    can_wait: e.canWait,
    photo: e.photoUrl,
    no_photo_reason: e.noPhotoReason,
    reporter_name: e.reporterName,
    reporter_email: e.reporterEmail,
    created_at: e.createdAtISO,
  };
  const frontmatter = Object.entries(fm)
    .map(([k, v]) => `${k}: ${yamlValue(v)}`)
    .join("\n");

  const lines = [
    "---",
    frontmatter,
    "---",
    "",
    `# Handyman ${e.kind} on ${e.workstream}`,
    "",
    `**Issue.** ${e.issue}`,
    "",
    e.summary ? `**Summary.** ${e.summary}` : "",
    e.recommendation ? `**Recommendation.** ${e.recommendation}` : "",
    "",
    e.amount != null ? `Quoted amount: $${e.amount}.` : "No quote provided.",
    e.safetyAffected ? "Safety or habitability is affected." : "",
    e.photoUrl ? `Photo: ${e.photoUrl}` : `No photo. Reason: ${e.noPhotoReason ?? "not given"}`,
    "",
    "_Reconcile into the Property Management workstream of the canonical tracker._",
    "",
  ];
  return lines.filter((l) => l !== "").join("\n") + "\n";
}

function fileName(e: HandymanEvent): string {
  // Sortable UTC stamp, no characters that need escaping on disk.
  const stamp = e.createdAtISO.replace(/[:.]/g, "-");
  return `${stamp}__${e.reportId}__${e.kind}.md`;
}

class FsVaultSink implements VaultSink {
  constructor(private baseDir: string) {}
  async writeHandymanEvent(event: HandymanEvent): Promise<{ path: string }> {
    const dir = this.baseDir;
    await fs.mkdir(dir, { recursive: true });
    const full = path.join(dir, fileName(event));
    // Append only: write a fresh file per event; never edit an existing one.
    await fs.writeFile(full, renderEventFile(event), { flag: "wx" }).catch(
      async (err: NodeJS.ErrnoException) => {
        // Extremely unlikely name collision; suffix and retry once.
        if (err.code === "EEXIST") {
          await fs.writeFile(full.replace(/\.md$/, `-${event.status}.md`), renderEventFile(event));
          return;
        }
        throw err;
      }
    );
    return { path: full };
  }
}

let cached: VaultSink | null = null;

export function getVaultSink(): VaultSink {
  if (cached) return cached;
  if (env.providers.vault === "real") {
    if (!env.vaultInboxPath) {
      throw new Error(
        "VAULT_SINK=real but VAULT_INBOX_PATH is empty. Point it at the synced vault inbox."
      );
    }
    cached = new FsVaultSink(env.vaultInboxPath);
  } else {
    // Mock: a local folder in the repo, gitignored.
    cached = new FsVaultSink(path.join(process.cwd(), "vault_inbox", "handyman"));
  }
  return cached;
}
