/**
 * Eliot's locked prioritization rubric (section 4). Encoded once, used as the
 * single weighting logic everywhere this app ranks or escalates anything.
 *
 * Top to bottom:
 *   1. Money at risk or on the table
 *   2. Hard external deadlines
 *   3. Someone waiting on you
 *   4. Everything else
 *
 * Tie break: the bigger dollar figure or the closer date wins.
 *
 * People priority (Non Negotiable 4) lives INSIDE tier 3 as a private weighting
 * on who is waiting. It is never a standalone score and never leaves the server.
 * It must not be rendered in any experience a ranked person can reach.
 */

export type RubricInput = {
  // Tier 1: dollars at risk or on the table. null or 0 means none.
  moneyAtRisk?: number | null;
  // Tier 2: a hard external deadline.
  hardDeadline?: Date | null;
  // Tier 3: someone is waiting on Eliot.
  someoneWaiting?: boolean;
  // Tier 3 private weighting (PeoplePriority.weight). Higher sorts first.
  // PRIVATE: never surface this value to any external experience.
  peoplePriorityWeight?: number;
  // Final tie break for tiers 3 and 4: earlier is more urgent.
  createdAt?: Date;
};

export type RubricTier = 1 | 2 | 3 | 4;

export function rubricTier(item: RubricInput): RubricTier {
  if (item.moneyAtRisk != null && item.moneyAtRisk > 0) return 1;
  if (item.hardDeadline != null) return 2;
  if (item.someoneWaiting) return 3;
  return 4;
}

/**
 * Comparator for Array.prototype.sort. Returns a negative number when `a` is
 * MORE urgent than `b` (so urgent items come first).
 */
export function compareByRubric(a: RubricInput, b: RubricInput): number {
  const ta = rubricTier(a);
  const tb = rubricTier(b);
  if (ta !== tb) return ta - tb; // lower tier number is more urgent

  switch (ta) {
    case 1: {
      // bigger dollar figure wins
      const da = a.moneyAtRisk ?? 0;
      const db = b.moneyAtRisk ?? 0;
      if (da !== db) return db - da;
      break;
    }
    case 2: {
      // closer date wins
      const da = a.hardDeadline?.getTime() ?? Infinity;
      const db = b.hardDeadline?.getTime() ?? Infinity;
      if (da !== db) return da - db;
      break;
    }
    case 3: {
      // private people priority weight, higher first
      const wa = a.peoplePriorityWeight ?? 0;
      const wb = b.peoplePriorityWeight ?? 0;
      if (wa !== wb) return wb - wa;
      break;
    }
  }
  // Final tie break: earlier createdAt is more urgent.
  const ca = a.createdAt?.getTime() ?? 0;
  const cb = b.createdAt?.getTime() ?? 0;
  return ca - cb;
}

export function sortByRubric<T>(items: T[], project: (t: T) => RubricInput): T[] {
  return [...items].sort((a, b) => compareByRubric(project(a), project(b)));
}
