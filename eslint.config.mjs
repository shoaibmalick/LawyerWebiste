import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code checks git worktrees out in here. A worktree is a full
    // second copy of this project, so without this ESLint lints the whole
    // repo twice over and `npm run lint` drowns in thousands of duplicates.
    ".claude/**",
  ]),
]);

export default eslintConfig;
