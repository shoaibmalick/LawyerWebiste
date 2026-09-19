import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Connections per instance.
 *
 * The pool was unconfigured, which meant node-postgres' default of 10. That is
 * fine for one long-running server and wrong for serverless: on Vercel each
 * concurrent function instance evaluates this module and opens its *own* pool,
 * so twenty simultaneous instances want two hundred connections. Postgres
 * defaults to 100 and Supabase's smaller tiers allow far fewer, so the failure
 * mode is "sorry, too many clients already" under exactly the traffic a client
 * would be pleased to have.
 *
 * A small number per instance is right when instances are many and short-lived.
 * Override with DATABASE_POOL_MAX for a traditional always-on deployment, where
 * one process serves everything and a larger pool is the better trade.
 *
 * This is not a substitute for connecting through a pooler. For Supabase that
 * means the connection-pooling URL (port 6543), not the direct one (5432) —
 * see the onboarding checklist in CLAUDE.md.
 */
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 5);

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: POOL_MAX,
  // Hand connections back quickly. A serverless instance that goes idle should
  // not sit holding a connection another instance is queuing for.
  idleTimeoutMillis: 10_000,
  // Fail the request rather than hanging on an exhausted pool. A visitor who
  // sees an error in two seconds can retry; one watching a spinner for thirty
  // has already left, and the request is still occupying resources.
  connectionTimeoutMillis: 5_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Cached across module reloads in development only: Next's HMR re-evaluates
// this file on every edit, and without the cache each reload would leak another
// pool until the dev database refused new connections.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
