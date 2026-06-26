import { NextResponse } from "next/server";
import { devSignIn, homePathFor } from "@/lib/auth";

// Development only sign in shortcut. Guarded by DEV_AUTH_SHORTCUT in devSignIn.
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const user = await devSignIn(email);
  if (!user) {
    return NextResponse.redirect(new URL("/?error=denied", req.url), { status: 303 });
  }
  return NextResponse.redirect(new URL(homePathFor(user), req.url), { status: 303 });
}
