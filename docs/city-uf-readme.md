# City → UF Resolver — Usage & API

This module implements a pure city→UF resolution service and a small UI binder.

Files:
- `src/shared/city-uf-resolver.ts` — pure functions and data loaders
- `src/ui/city-uf-ui.ts` — small UI helper that attaches autofill behaviour between city and UF inputs
- `tests/city-uf-resolver.test.js` — unit tests for the resolver

API (main boundary):
- `resolveCityToUf(city, currentUf, index)` → returns `{ uf, status, reason?, matches? }` where `status` is one of `ok|inferred|ambiguous|invalid|divergent`.
- `normalizeCityName(input)` — normalization utility (accents, case, spaces, apostrophes/hyphens handled).
- `buildIndexFromData(raw)` — builds lookup index from `estados-cidades.json`/`estados-cidades2.json` shapes.
- `loadIndexFromProjectData()` — helper to load `public/data/jsonCidades/estados-cidades.json`.

How to use in UI:
1. Build index once on app startup: `const index = loadIndexFromProjectData();`
2. Attach UI handler: `attachCityUfAutofill(cityInputEl, ufInputEl, index, onAutofilled)`

Notes:
- The resolver is purposely pure; it does not read or modify the DOM.
- The resolver will not invent cities or infer when ambiguous — ambiguous results include the matching states.
- Tests are run with `npm run test:city` (build + node test runner).

Example: `npm run test:city` → runs the new unit tests.
