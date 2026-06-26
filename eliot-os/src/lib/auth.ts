import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { env } from "./env";

/**
 * Per person identity via magic link (section 5). No shared role passwords.
 * Sessions are server rows; the browser holds only an opaque, signed session id.
 * Revocation is deleting the Session row (or setting User.active = false).
 */

const SESSION_COOKIE = "eliot_session";
const MAGIC_LINK_TTL_MS = 1000 * 60 * 30; // 30 minutes
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  experience: string;
  familyId: string | null;
};

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", env.authSecret).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", env.authSecret).update(value).digest("hex");
  // constant time compare
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

/** Create a one time magic link for a provisioned email. Returns the full URL,
 * or null if no active user has that email (do not reveal which). */
export async function createMagicLink(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return null;
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.magicLink.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS) },
  });
  return `${env.appUrl}/auth/verify?token=${token}`;
}

/** Consume a magic link token: validate, mark used, open a session. */
export async function consumeMagicLink(token: string): Promise<SessionUser | null> {
  const link = await prisma.magicLink.findUnique({ where: { token }, include: { user: true } });
  if (!link || link.usedAt || link.expiresAt < new Date() || !link.user.active) return null;
  await prisma.magicLink.update({ where: { token }, data: { usedAt: new Date() } });
  await openSession(link.userId);
  return toSessionUser(link.user);
}

/** Dev only: sign in directly as a seeded user by email. Guarded by the flag. */
export async function devSignIn(email: string): Promise<SessionUser | null> {
  if (!env.devAuthShortcut) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return null;
  await openSession(user.id);
  return toSessionUser(user);
}

async function openSession(userId: string): Promise<void> {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const signed = jar.get(SESSION_COOKIE)?.value;
  const sessionId = verify(signed);
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  jar.delete(SESSION_COOKIE);
}

/** The current authenticated user, or null. Reads the signed session cookie. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sessionId = verify(jar.get(SESSION_COOKIE)?.value);
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return toSessionUser(session.user);
}

function toSessionUser(u: {
  id: string; email: string; name: string; role: string; experience: string; familyId: string | null;
}): SessionUser {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    experience: u.experience, familyId: u.familyId,
  };
}

export function isAdmin(u: SessionUser): boolean {
  return u.role === "eliot" || u.role === "operator";
}

/** The landing path for a user after sign in: straight to their lane. */
export function homePathFor(u: SessionUser): string {
  if (isAdmin(u)) return "/console";
  switch (u.experience) {
    case "contractor": return "/contractor";
    case "portfolio": return "/portfolio";
    case "fund": return "/fund";
    case "family": return u.familyId === "A" ? "/family/A" : "/family/B";
    default: return "/";
  }
}
