import type { Prisma } from "@prisma/client";
import {
  Experience,
  FamilyId,
  laneForScope,
  HANDYMAN_WORKSTREAM,
} from "./constants";

/**
 * The confidentiality wall (Non Negotiable 1), enforced at the data layer.
 *
 * Every read is scoped by experience, and for the family lane by familyId. The
 * helpers below return Prisma `where` clauses that PHYSICALLY cannot return out
 * of scope rows. There is no "unscoped query" convenience: callers must pass a
 * Scope, derived from the authenticated session, and the builders fold the wall
 * into the query itself rather than relying on front end filtering.
 *
 * A scope that cannot resolve a lane (for example a family user with no familyId)
 * collapses to noMatch(), which matches zero rows. Fail closed, never open.
 */

export type Scope = {
  userId: string;
  experience: Experience;
  familyId: FamilyId | null;
  // eliot and operator. Admins reach all four lanes and the console.
  isAdmin: boolean;
};

export function scopeFromUser(u: {
  id: string;
  experience: string;
  familyId: string | null;
  role: string;
}): Scope {
  return {
    userId: u.id,
    experience: u.experience as Experience,
    familyId: (u.familyId as FamilyId | null) ?? null,
    isAdmin: u.role === "eliot" || u.role === "operator",
  };
}

// A where clause that can never match a real row (ids are cuids).
function noMatch<T extends { id?: unknown }>(): T {
  return { id: "__no_match__" } as unknown as T;
}

/** Can this scope even open the given experience? Used by routing guards. */
export function canReach(scope: Scope, target: Experience): boolean {
  if (scope.isAdmin) return true;
  return scope.experience === target;
}

/** Can this scope reach the given family room? Seals A from B. */
export function canReachFamily(scope: Scope, familyId: FamilyId): boolean {
  if (scope.isAdmin) return true;
  return scope.experience === "family" && scope.familyId === familyId;
}

/**
 * Workstreams readable by this scope.
 * - admin: all
 * - portfolio/fund: workstreams tagged that lane
 * - family: workstreams tagged exactly this family's room (A or B), never both
 * - contractor: only the Property Management workstream (the Handyman's source)
 */
export function workstreamWhere(scope: Scope): Prisma.WorkstreamWhereInput {
  if (scope.isAdmin) return {};
  if (scope.experience === "contractor") {
    return { name: HANDYMAN_WORKSTREAM };
  }
  const lane = laneForScope(scope.experience, scope.familyId);
  if (!lane) return noMatch();
  return { experience: lane };
}

/**
 * Maintenance reports readable by this scope.
 * - admin: all
 * - portfolio: the read side of the maintenance loop (Property Management)
 * - contractor: only reports this contractor filed
 * - fund/family: none
 */
export function maintenanceReportWhere(
  scope: Scope
): Prisma.MaintenanceReportWhereInput {
  if (scope.isAdmin) return {};
  if (scope.experience === "portfolio") {
    return { workstream: { is: { name: HANDYMAN_WORKSTREAM } } };
  }
  if (scope.experience === "contractor") {
    return { reporterId: scope.userId };
  }
  return noMatch();
}

/**
 * Bookings readable by this scope. Non admins see only their own, and only in
 * their own lane. Admins (operator console) see all.
 */
export function bookingWhere(scope: Scope): Prisma.BookingWhereInput {
  if (scope.isAdmin) return {};
  return { userId: scope.userId, experience: scope.experience };
}

/**
 * Email drafts are administrative. Only admins (the Operator Console approval
 * queue) may read them. Everyone else: none.
 */
export function emailDraftWhere(scope: Scope): Prisma.EmailDraftWhereInput {
  if (scope.isAdmin) return {};
  return noMatch();
}

/**
 * Properties readable by this scope, scoped through their workstream.
 */
export function propertyWhere(scope: Scope): Prisma.PropertyWhereInput {
  if (scope.isAdmin) return {};
  if (scope.experience === "contractor") {
    return { workstream: { is: { name: HANDYMAN_WORKSTREAM } } };
  }
  const lane = laneForScope(scope.experience, scope.familyId);
  if (!lane) return noMatch();
  return { workstream: { is: { experience: lane } } };
}
