import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js convention keeps local secrets in .env.local, not .env — the Prisma
// CLI runs outside Next's own env loader, so load it explicitly here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --env-file=.env.local prisma/seed.ts",
  },
  datasource: {
    /**
     * The DIRECT (unpooled) endpoint, derived from DATABASE_URL rather than
     * configured separately.
     *
     * Neon's pooled endpoint is PgBouncer in transaction mode, which cannot
     * serve `prisma migrate`: it needs session-scoped advisory locks and
     * prepared statements. The direct host is the pooled host without the
     * "-pooler" infix, so stripping it is exact.
     *
     * Derived, not a second environment variable, because a second variable can
     * disagree with the first. It did: `npm run test:db:setup` runs through
     * `dotenv -e .env.test`, which sets DATABASE_URL to the local test database
     * but knows nothing about a DIRECT_DATABASE_URL — so this file filled that
     * from .env.local and pointed the CLI at the production Neon database. The
     * integration tests truncate tables. One variable cannot desync from itself.
     *
     * A URL with no "-pooler" (the local Docker test database) is returned
     * unchanged.
     */
    url: process.env.DATABASE_URL?.replace("-pooler.", "."),
  },
});
