import { NextResponse, type NextRequest } from "next/server";

/**
 * Site wide password gate.
 *
 * Hides the ENTIRE site behind a single shared password using HTTP Basic Auth,
 * so the browser prompts before any page, asset route, or API handler renders.
 * This sits in front of the app's own per user sign in: a visitor first clears
 * this shared password, then signs in normally as their seeded account.
 *
 * The password is read from SITE_PASSWORD when set, with a fallback so the gate
 * works out of the box. To rotate it without a code change, set SITE_PASSWORD in
 * the host environment. Any username is accepted; only the password is checked.
 */

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? "Swimkim5#";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Eliot OS", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  // Basic credentials are "username:password"; the username is ignored.
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (password !== SITE_PASSWORD) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Gate everything except Next internals and the favicon. The browser caches
  // the accepted credentials for the session, so one prompt covers the visit.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
