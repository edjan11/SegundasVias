### Summary

This PR hardens print HTML generation to prevent XSS and unsafe resource inclusion.

**What this includes:**
- Shared utility `src/prints/shared/print-utils.ts` with `escapeHtml`, `sanitizeHref` and `sanitizeCss`.
- Sanitization applied to print templates and dynamic cloned HTML:
  - `src/prints/nascimento/printNascimentoTj.ts` (escaped fields + safe css href)
  - `src/acts/obito/printTemplate.ts` (escaped fields)
  - `src/acts/nascimento/nascimento.ts` (cloned HTML sanitation: link/style/attributes sanitize + attribute removal)
- Tests added: `tests/print-test.js` and `tests/print-utils-test.js` (both run via `npm run test:prints`).
- Formatter run (Prettier) across repo; import spec fixes to make compiled output runnable in Node (ESM import compatibility).

### Why
Print generators build HTML from external data and from cloned DOM fragments. Without sanitization, a malicious or malformed value could inject script/style/href that performs XSS or forces remote JS/CSS loading in a print context. This PR neutralizes those vectors while preserving existing public function contracts.

### Verification
- `npm run build` ✅
- `npm run test:prints` ✅ (build + print tests passed locally)
- Prettier formatting applied

### Remaining & follow-ups
- Address remaining `@typescript-eslint/no-explicit-any` lint debt across repository (many occurrences remain). This is a larger refactor and out of scope for this PR.
- Add unit tests for validators (CPF, name, date/time) — suggested next task.
- Consider adding DOM-based E2E tests (e.g., with jsdom) to validate cloned DOM sanitization more comprehensively.

### Checklist
- [x] Tests added for print utilities
- [x] Formatting (Prettier) run
- [x] Local build & tests passing
- [ ] Open PR on GitHub and request review

---

#### How to review locally
1. git checkout -b fix/casamento-matricula origin/fix/casamento-matricula
2. npm ci
3. npm run build
4. npm run test:prints

---

If you want, I can: (A) continue applying sanitization across other templates and add more tests, or (B) open this PR for review now (I prepared the branch and commits).