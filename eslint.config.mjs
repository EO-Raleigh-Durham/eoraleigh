import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Code copied from edge8-web (src/kernel, src/entities) keeps edge8's lint
// policy: the React Compiler hook rules warn rather than fail, as they do
// upstream, so a sync never means rewriting upstream components. The chapter's
// own code keeps the stricter defaults.
const CLASSIC_HOOKS_RULES = new Set(["react-hooks/rules-of-hooks", "react-hooks/exhaustive-deps"]);
const reactCompilerRulesAtWarn = Object.fromEntries(
  nextVitals
    .flatMap((config) => Object.keys(config.rules ?? {}))
    .filter((rule) => rule.startsWith("react-hooks/") && !CLASSIC_HOOKS_RULES.has(rule))
    .map((rule) => [rule, "warn"]),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["src/kernel/**", "src/entities/**"], rules: reactCompilerRulesAtWarn },
  globalIgnores([
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    ".claude/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
