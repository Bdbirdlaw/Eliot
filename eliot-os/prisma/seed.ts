import { PrismaClient } from "@prisma/client";
import { SEED_WORKSTREAMS, HANDYMAN_WORKSTREAM } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  // --- Booking rules (section 9) ---------------------------------------------
  const rules = [
    { role: "contractor", slotMinutes: 15, leadTimeHours: 48, requiresApproval: true, priority: 3, routeToTriage: true },
    { role: "tenant", slotMinutes: 15, leadTimeHours: 48, requiresApproval: true, priority: 3, routeToTriage: true },
    { role: "investor", slotMinutes: 30, leadTimeHours: 24, requiresApproval: false, priority: 2, routeToTriage: false },
    { role: "family_member", slotMinutes: 60, leadTimeHours: 12, requiresApproval: false, priority: 1, routeToTriage: false },
  ];
  for (const r of rules) {
    await prisma.bookingRule.upsert({ where: { role: r.role }, update: r, create: r });
  }

  // --- The seven real workstreams, seeded UNASSIGNED (section 1) -------------
  for (const name of SEED_WORKSTREAMS) {
    await prisma.workstream.upsert({
      where: { name },
      update: {},
      create: { name, experience: null },
    });
  }
  const pm = await prisma.workstream.findUnique({ where: { name: HANDYMAN_WORKSTREAM } });

  // --- Properties under Property Management (the Handyman's select) ----------
  const properties = [
    { label: "Unit 4B, 220 Rosa Parks", address: "220 Rosa Parks Blvd, Nashville TN" },
    { label: "Duplex A, 1109 Fatherland", address: "1109 Fatherland St, Nashville TN" },
    { label: "Storefront, 98 Volunteer Drive", address: "98 Volunteer Dr, Nashville TN" },
  ];
  for (const p of properties) {
    const existing = await prisma.property.findFirst({ where: { label: p.label } });
    if (!existing) {
      await prisma.property.create({ data: { ...p, workstreamId: pm?.id } });
    }
  }

  // --- One user per role (section 5) ----------------------------------------
  const users = [
    { email: "marcus@rivera-trades.example", name: "Marcus Rivera", role: "contractor", experience: "contractor", familyId: null },
    { email: "dana@tenant.example", name: "Dana Cole", role: "tenant", experience: "contractor", familyId: null },
    { email: "priya@silverstar.example", name: "Priya Nair", role: "investor", experience: "fund", familyId: null },
    { email: "whitfield@familya.example", name: "Helen Whitfield", role: "family_member", experience: "family", familyId: "A" },
    { email: "ashford@familyb.example", name: "James Ashford", role: "family_member", experience: "family", familyId: "B" },
    { email: "eliot@eliotos.example", name: "Eliot Silverman", role: "eliot", experience: "operator", familyId: null },
    { email: "operator@eliotos.example", name: "Operations", role: "operator", experience: "operator", familyId: null },
  ];
  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, experience: u.experience, familyId: u.familyId, active: true },
      create: u,
    });
    created[u.role + (u.familyId ?? "")] = user.id;
  }

  // --- People priority (PRIVATE; never exposed). Tier 3 weighting only. ------
  const priorities = [
    { role: "investor", weight: 80, note: "Anchor LP in Silver Star." },
    { role: "family_memberA", weight: 95, note: "White glove family office A." },
    { role: "family_memberB", weight: 90, note: "White glove family office B." },
    { role: "contractor", weight: 20, note: "Reliable trade." },
  ];
  for (const p of priorities) {
    const personId = created[p.role];
    if (!personId) continue;
    await prisma.peoplePriority.upsert({
      where: { personId },
      update: { weight: p.weight, note: p.note },
      create: { personId, weight: p.weight, note: p.note },
    });
  }

  // --- A couple of demo rows so the surfaces are not empty -------------------
  // One queued maintenance report (read side of the loop shows on portfolio).
  if (pm && created["contractor"]) {
    const existing = await prisma.maintenanceReport.findFirst({ where: { issue: { contains: "kitchen faucet" } } });
    if (!existing) {
      await prisma.maintenanceReport.create({
        data: {
          workstreamId: pm.id,
          reporterId: created["contractor"],
          issue: "Dripping kitchen faucet in Unit 4B, slow but steady.",
          safetyAffected: false,
          hasQuote: true,
          amount: 180,
          canWait: true,
          bucket: "queue",
          decisionSource: "model",
          summary: "Minor plumbing drip in Unit 4B.",
          recommendation: "Approve the $180 quote; routine repair.",
          status: "queued",
        },
      });
    }
  }

  // One sample fund lane email draft for the approval queue demo.
  if (created["investor"]) {
    const existing = await prisma.emailDraft.findFirst({ where: { subject: { contains: "Q2 update" } } });
    if (!existing) {
      await prisma.emailDraft.create({
        data: {
          lane: "fund",
          toUserId: created["investor"],
          toEmail: "priya@silverstar.example",
          subject: "Silver Star Q2 update",
          body: "Priya,\n\nA short note on quarter progress and the next capital call window. Full reporting is in your portal.\n\nBest,\nEliot",
          status: "draft",
          autoSendEligible: false,
        },
      });
    }
  }

  // --- Nurture journey: new contractor and vendor activation ----------------
  // Every step lands as a draft in the approval queue (draft and approve).
  const journey = await prisma.journey.upsert({
    where: { key: "contractor_activation" },
    update: {},
    create: {
      key: "contractor_activation",
      name: "Contractor and vendor activation",
      lane: "contractor",
      audience: "New contractors and vendors",
      active: true,
    },
  });

  const steps = [
    {
      order: 1,
      dayOffset: 0,
      subject: "You are set up with Eliot OS",
      body: `{{firstName}},

You now have access to file maintenance issues directly with our office through Eliot OS.

How it works. Open the maintenance portal, pick the property, describe the issue, add a photo, and submit. Most routine issues are reviewed and approved on submission, so you are cleared to proceed without waiting on a call.

Keep a clear photo on every submission. It is the fastest path to an approval.

Eliot OS`,
    },
    {
      order: 2,
      dayOffset: 2,
      subject: "How decisions get made",
      body: `{{firstName}},

A quick note on what happens after you submit.

Approved. Routine work with a quote at or under the standing threshold is logged and cleared. You can proceed.
Under review. Anything ambiguous or above the threshold is sent to our office for a decision. You will be notified.
Escalated. Anything affecting safety or habitability goes straight to a person for immediate handling.

The clearer the issue and the photo, the faster the decision.

Eliot OS`,
    },
    {
      order: 3,
      dayOffset: 7,
      subject: "Getting cleared faster",
      body: `{{firstName}},

Two things move work through quickly.

Include a price. A submission with a quote at or under the threshold that can wait is cleared automatically.
Show the problem. A photo that matches the description lets us decide on the spot.

If a unit is locked and a photo is not possible, use the no photo option and tell us why. It will route straight to review.

Eliot OS`,
    },
    {
      order: 4,
      dayOffset: 14,
      subject: "What we look for in our trades",
      body: `{{firstName}},

We send steady, repeat work to the vendors we rely on. What earns that.

Fast, accurate intake. Clear quotes. Clean work. A reply when we reach out.

If there is a type of work you want more of, reply and let us know.

Eliot OS`,
    },
    {
      order: 5,
      dayOffset: 30,
      subject: "How is it going",
      body: `{{firstName}},

You have been filing with Eliot OS for a few weeks now. Anything getting in your way, or anything you would change about the process?

Reply to this note and it reaches our office directly.

Eliot OS`,
    },
  ];
  for (const s of steps) {
    await prisma.journeyStep.upsert({
      where: { journeyId_order: { journeyId: journey.id, order: s.order } },
      update: { dayOffset: s.dayOffset, subject: s.subject, body: s.body },
      create: { journeyId: journey.id, ...s },
    });
  }

  // Enroll the seeded contractor so the first touch is due immediately for demo.
  if (created["contractor"]) {
    await prisma.journeyEnrollment.upsert({
      where: { journeyId_userId: { journeyId: journey.id, userId: created["contractor"] } },
      update: {},
      create: {
        journeyId: journey.id,
        userId: created["contractor"],
        currentStep: 0,
        nextRunAt: new Date(),
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
