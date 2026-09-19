import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "generated/**"],

    /**
     * Test files run one at a time.
     *
     * The integration tests share a single database and each wipes the tables
     * it uses in beforeEach — two files touch Lead, two touch Booking and
     * AvailabilitySlot. Run in parallel, one file's cleanup deletes rows
     * another file is midway through asserting on. That produced a failure in
     * roughly one run of every eight: "expected +0 to be 2", the leads having
     * been deleted between being created and being counted.
     *
     * Hard to pin down because it is a scheduling race — never reproducible in
     * isolation, more likely on a loaded machine, so it surfaced mostly right
     * after a build or a migration and looked like something else each time.
     *
     * The alternative is a database per worker, which is more machinery than a
     * suite this size warrants. Serial execution costs a few seconds and buys a
     * result that means something.
     */
    fileParallelism: false,
  },
});
