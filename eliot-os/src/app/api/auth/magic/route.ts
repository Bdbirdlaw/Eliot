import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicLink } from "@/lib/auth";
import { getEmailProvider } from "@/lib/providers/email";
import { env } from "@/lib/env";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const link = await createMagicLink(parsed.data.email);

  // Send the link by email when provisioned. We never reveal whether the email
  // was provisioned, to avoid leaking who has access.
  if (link) {
    await getEmailProvider()
      .send({
        to: parsed.data.email,
        subject: "Your Eliot OS sign in link",
        body: `Use this one time link to sign in. It expires in 30 minutes.\n\n${link}`,
      })
      .catch(() => {});
  }

  // In dev, surface the link directly so there is no need to read mail.
  return NextResponse.json({
    ok: true,
    devLink: env.devAuthShortcut && link ? link : undefined,
  });
}
