import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, homePathFor, type SessionUser } from "./auth";
import { scopeFromUser, canReach, canReachFamily, type Scope } from "./scope";
import type { Experience, FamilyId } from "./constants";

/**
 * Server side route guards. Every gated page calls one of these first. They
 * enforce the wall before any data is read: an out of scope user is redirected,
 * never shown a chooser of lanes they cannot enter (section 5).
 */

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireScope(): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  return { user, scope: scopeFromUser(user) };
}

export async function requireExperience(
  target: Experience
): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  const scope = scopeFromUser(user);
  if (!canReach(scope, target)) redirect(homePathFor(user));
  return { user, scope };
}

export async function requireFamily(
  familyId: FamilyId
): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  const scope = scopeFromUser(user);
  // Seals Family A from Family B. A family member of the other room is bounced
  // to their own home, never shown the other room.
  if (!canReachFamily(scope, familyId)) redirect(homePathFor(user));
  return { user, scope };
}

export async function requireAdmin(): Promise<{ user: SessionUser; scope: Scope }> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect(homePathFor(user));
  return { user, scope: scopeFromUser(user) };
}
