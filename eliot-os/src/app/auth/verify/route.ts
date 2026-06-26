import { NextResponse } from "next/server";
import { consumeMagicLink, homePathFor } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const user = await consumeMagicLink(token);
  if (!user) {
    return NextResponse.redirect(new URL("/?error=link", req.url), { status: 303 });
  }
  return NextResponse.redirect(new URL(homePathFor(user), req.url), { status: 303 });
}
