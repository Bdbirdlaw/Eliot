import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { advanceDueJourneys } from "@/lib/journey";

/**
 * Advance all due nurture journey steps. Each due step is written as a draft
 * into the approval queue; nothing is sent here.
 *
 * Auth: an admin session, OR a scheduler presenting the CRON_SECRET as a bearer
 * token. Point a cron (for example Vercel Cron, hourly) at this route in prod.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const admin = user && isAdmin(user);

  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.replace(/^Bearer\s+/i, "");
  const cronOk = env.cronSecret.length > 0 && presented === env.cronSecret;

  if (!admin && !cronOk) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { drafts } = await advanceDueJourneys(new Date());
  return NextResponse.json({ ok: true, drafts });
}
