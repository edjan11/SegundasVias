Quality report — quick summary

Actions taken
- Added Prettier and ESLint configs and plugins (`eslint-plugin-unused-imports`).
- Added scripts for formatting, linting, ts-prune, depcheck and bundle analysis in `package.json`.
- Generated UI bundles with external sourcemaps (`npm run ui:bundle`).
- Added `ui/js/*.bundle.*` to `.gitignore` and removed tracked bundles from git index.

Immediate results
- Bundles built: `casamento` 140kb, `nascimento` 137kb, `obito` 109kb. External sourcemaps generated.
- `ts-prune` reported potentially unused exports (see `npm run prune`).
- `depcheck` reported missing deps: `espree` (dev), `electron`, `zod`.
- ESLint --fix ran and fixed many issues; remaining: ~180 problems (mix of errors and warnings). Many are:
  - `@ts-nocheck` (flagged by `@typescript-eslint/ban-ts-comment`)
  - `no-explicit-any` (many `any` usages)
  - `no-var-requires` (CommonJS `require` in TS files)
  - `no-undef` for DOM globals in Node-target files
  - `no-empty` (empty catch/blocks)

Recommended next automated steps (I will proceed unless you ask otherwise)
1. Install missing dev dep `espree` and runtime deps `zod` (dev choices may vary). This will silence `depcheck` missing reports.
   Command: `npm install --save-dev espree && npm install zod electron`
2. Triage and auto-fix low-risk ESLint issues file-by-file:
   - Replace simple `require(...)` usages with `import` where the module supports it.
   - Remove or justify `@ts-nocheck` comments (prefer removing and fixing the underlying type issues).
   - Fix `no-empty` by adding comments or explicit returns where appropriate.
   I will run `eslint --fix` again and then create a prioritized list of remaining errors to fix manually.
3. Optionally, convert a few large UI files to smaller modules or improve type annotations to reduce `any` usage.

What I did now
- Created this report.
- Left the repository with sourcemapped bundles and bundles untracked by git so you can edit TS sources directly.

If you want me to continue, I will: install `espree` + `zod`, re-run `depcheck`, then perform safe automated fixes (convert `require`→`import`, remove trivial `@ts-nocheck`, fix `no-empty`), and generate a prioritized patch list for the remaining manual work.

Reply with "Proceed" to allow those automated fixes, or "Report only" to stop here with just the report.
