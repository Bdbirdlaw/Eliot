// Allowed values for the String fields that stand in for enums under SQLite.
// These are the single source of truth for roles, scopes, and statuses.

export const ROLES = [
  "contractor",
  "tenant",
  "investor",
  "family_member",
  "eliot",
  "operator",
] as const;
export type Role = (typeof ROLES)[number];

// The five scopes a user can carry. "operator" reaches everything.
export const EXPERIENCES = [
  "contractor",
  "portfolio",
  "fund",
  "family",
  "operator",
] as const;
export type Experience = (typeof EXPERIENCES)[number];

// Workstream lane tags (section 1). Note family splits into two sealed rooms.
export const WORKSTREAM_LANES = [
  "portfolio",
  "fund",
  "family_a",
  "family_b",
] as const;
export type WorkstreamLane = (typeof WORKSTREAM_LANES)[number];

export const FAMILY_IDS = ["A", "B"] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

export const TRIAGE_BUCKETS = ["auto", "queue", "escalate"] as const;
export type TriageBucket = (typeof TRIAGE_BUCKETS)[number];

export const REPORT_STATUS = ["logged", "queued", "escalated", "resolved"] as const;
export const BOOKING_STATUS = ["requested", "confirmed", "declined", "cancelled"] as const;
export const EMAIL_STATUS = ["draft", "approved", "sent", "discarded"] as const;

// Lanes that email can belong to. High stakes lanes are always draft+approve.
export const EMAIL_LANES = ["contractor", "portfolio", "fund", "family"] as const;
export type EmailLane = (typeof EMAIL_LANES)[number];

// Only these two lanes may ever auto send, and only for whitelisted templates.
export const AUTO_SEND_LANES: EmailLane[] = ["contractor", "portfolio"];

// The seven real workstreams, seeded with NO lane assignment on purpose.
export const SEED_WORKSTREAMS = [
  "JCE Owner LLC",
  "DB17LP Owner LLC",
  "98 Volunteer Drive",
  "The Bend",
  "Project Secondhand",
  "Dry Cleaning",
  "Property Management",
] as const;

// The workstream the Handyman feeds.
export const HANDYMAN_WORKSTREAM = "Property Management";

// Fixed model string for triage and drafting. Do not change casually.
export const MODEL_ID = "claude-sonnet-4-6";

// Map a user role to its default experience scope.
export function defaultExperienceForRole(role: Role): Experience {
  switch (role) {
    case "contractor":
    case "tenant":
      return "contractor";
    case "investor":
      return "fund";
    case "family_member":
      return "family";
    case "eliot":
    case "operator":
      return "operator";
  }
}

// Resolve which workstream lane tag a scope can read. Family scope resolves to
// exactly one of the two sealed rooms based on familyId.
export function laneForScope(
  experience: Experience,
  familyId?: string | null
): WorkstreamLane | null {
  switch (experience) {
    case "portfolio":
      return "portfolio";
    case "fund":
      return "fund";
    case "family":
      return familyId === "A" ? "family_a" : familyId === "B" ? "family_b" : null;
    default:
      return null;
  }
}
