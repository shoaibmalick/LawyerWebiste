import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { services } from "../config/content/services";
import { PrismaClient } from "../generated/prisma/client";
import { BCRYPT_COST } from "../lib/password";
import { resolveSeedAdmin } from "../lib/seed-admin";
import { assessSeed, expectedConfirmation } from "../lib/seed-guard";

/**
 * Whether this run is allowed to proceed. The decision lives in
 * lib/seed-guard.ts so it can be tested; this function is only the plumbing —
 * printing, and reading the confirmation when a person is present.
 *
 * The question it asks is "which database am I pointed at", not "which
 * environment do I claim to be in". NODE_ENV is routinely unset when someone
 * runs a one-off script against a production connection string, which is
 * exactly the case the previous guard missed.
 */
async function assertSafeToSeed(): Promise<void> {
  const decision = assessSeed({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    allowDestructive: process.env.ALLOW_DESTRUCTIVE_SEED,
    isTty: Boolean(process.stdin.isTTY),
  });

  if (decision.verdict === "refuse") {
    throw new Error(decision.message);
  }

  if (decision.verdict === "confirm") {
    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const typed = await rl.question(decision.message);
      const expected = expectedConfirmation(process.env.DATABASE_URL);
      if (typed.trim() !== expected) {
        throw new Error(`Refusing to seed: expected "${expected}", got "${typed.trim()}".`);
      }
    } finally {
      rl.close();
    }
    console.warn(`Confirmed. Seeding ${expectedConfirmation(process.env.DATABASE_URL)}.`);
    return;
  }

  // Loudly either way, so the log records which database was seeded even on
  // the ordinary local path.
  console.warn(decision.message);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLOT_HOURS = [9, 10, 11, 13, 14, 15];
const WEEKDAYS_AHEAD = 3;
// Long enough for the longest seeded service, so every service is bookable.
const SLOT_MINUTES = Math.max(...services.map((service) => service.durationMinutes));

function nextWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function main() {
  await assertSafeToSeed();

  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();

  const days = nextWeekdays(WEEKDAYS_AHEAD);

  // One slot per opening, not one per service: a slot is a unit of the
  // business's time and the customer picks a service when booking. SLOT_MINUTES
  // must be at least as long as the longest service, or that service cannot be
  // booked online at all.
  for (const day of days) {
    for (const hour of SLOT_HOURS) {
      const startsAt = new Date(day);
      startsAt.setHours(hour, 0, 0, 0);

      await prisma.availabilitySlot.create({
        data: {
          startsAt,
          endsAt: new Date(startsAt.getTime() + SLOT_MINUTES * 60_000),
          capacity: 1,
        },
      });
    }
  }

  const slotCount = await prisma.availabilitySlot.count();
  console.log(`Seeded ${slotCount} availability slots.`);

  const admin = resolveSeedAdmin({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (admin) {
    const passwordHash = await bcrypt.hash(admin.password, BCRYPT_COST);
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: { passwordHash },
      create: { email: admin.email, passwordHash, name: "Admin" },
    });
    console.log(
      `Seeded admin user ${admin.email} — dev-only credentials, never use in production.`,
    );
  } else {
    console.warn("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipped admin user seed.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
