"use server";

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { requireExperience } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { HANDYMAN_WORKSTREAM } from "@/lib/constants";
import { runTriage, type TriageOutcome } from "@/lib/triage";
import { enrollInJourney } from "@/lib/journey";

export type FileReportState =
  | { ok: true; outcome: TriageOutcome }
  | { ok: false; error: string }
  | { idle: true };

const Fields = z.object({
  propertyLabel: z.string().min(1),
  issue: z.string().min(3, "Describe the issue."),
  safetyAffected: z.enum(["yes", "no"]),
  hasQuote: z.enum(["yes", "no"]),
  amount: z.string().optional(),
  canWait: z.enum(["yes", "no"]),
  noPhotoReason: z.string().optional(),
});

async function savePhoto(file: File): Promise<{ url: string; dataUrl: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.type.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, "");
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  return { url: `/uploads/${name}`, dataUrl };
}

export async function fileReport(
  _prev: FileReportState,
  formData: FormData
): Promise<FileReportState> {
  // Server enforced scope: only the contractor lane may file here.
  const { user } = await requireExperience("contractor");

  const parsed = Fields.safeParse({
    propertyLabel: formData.get("propertyLabel"),
    issue: formData.get("issue"),
    safetyAffected: formData.get("safetyAffected"),
    hasQuote: formData.get("hasQuote"),
    amount: formData.get("amount") ?? "",
    canWait: formData.get("canWait"),
    noPhotoReason: formData.get("noPhotoReason") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const f = parsed.data;

  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const noPhotoReason = (f.noPhotoReason ?? "").trim();

  // Block submission without a photo, unless the escape hatch reason is given.
  if (!hasPhoto && !noPhotoReason) {
    return { ok: false, error: "A photo is required. If one is not possible, say why." };
  }

  const hasQuote = f.hasQuote === "yes";
  const amount = hasQuote && f.amount ? Number(f.amount) : null;
  if (hasQuote && (amount == null || Number.isNaN(amount) || amount < 0)) {
    return { ok: false, error: "Enter a valid amount, or say you have no price." };
  }

  // The Handyman always feeds the Property Management workstream.
  const pm = await prisma.workstream.findUnique({ where: { name: HANDYMAN_WORKSTREAM } });
  if (!pm) return { ok: false, error: "Maintenance workstream is not configured." };

  let photoUrl: string | null = null;
  let photoDataUrl: string | null = null;
  if (hasPhoto) {
    const saved = await savePhoto(photo as File);
    photoUrl = saved.url;
    photoDataUrl = saved.dataUrl;
  }

  const outcome = await runTriage({
    workstreamId: pm.id,
    reporterId: user.id,
    issue: `${f.propertyLabel}: ${f.issue}`,
    safetyAffected: f.safetyAffected === "yes",
    hasQuote,
    amount,
    canWait: f.canWait === "yes",
    photoUrl,
    photoDataUrl,
    noPhotoReason: noPhotoReason || null,
  });

  // Activate new contractors into the nurture journey on their first filing.
  // enrollInJourney is idempotent, so repeat filings are a no op.
  if (user.role === "contractor") {
    await enrollInJourney("contractor_activation", user.id).catch(() => {});
  }

  return { ok: true, outcome };
}
