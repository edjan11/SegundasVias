# City → UF Integration Checklist (2ª via forms)

Where to plug the city→UF resolver (typical fields across flows):

- Nascimento
  - `registro.naturalidade.cidade` → `registro.naturalidade.uf`
  - `registro.residencia.cidade` → `registro.residencia.uf`
  - `cartorio.cidade` → `cartorio.uf`

- Casamento
  - `noivos*`: `residencia.cidade` → `residencia.uf`
  - `local.cidade` (local do ato) → `local.uf`
  - `cartorio.cidade` → `cartorio.uf`

- Óbito
  - `localDoFato.cidade` → `localDoFato.uf`
  - `residencia.cidade` → `residencia.uf`
  - `cartorio.cidade` → `cartorio.uf`

- Campos comuns / duplicados
  - `cidade` fields used for `naturalidade`, `residencia`, `local`, `cartorio` should all use the same resolver and share a single index instance for performance.

UI behaviour integration points:
- Attach `attachCityUfAutofill` to city inputs that sit next to UF inputs.
- Call the pure resolver on confirmation (blur/Enter/datalist select) and implement the focus shift and temporary readonly as described.
- On shift+Tab or click on UF input, remove readonly to allow editing.

Testing and validation:
- Unit tests for resolver (valid/invalid/ambiguous/divergent) — included in `tests/city-uf-resolver.test.js`.
- Manual test: open forms and try entering cities with/without UF, test shift+tab focus and correction flows.

Notes:
- The resolver is pure and can be re-used in server-side validation if needed (API boundary documented in `src/shared/city-uf-resolver.ts`).
- Use `loadIndexFromProjectData()` to load `public/data/jsonCidades/estados-cidades.json` at startup for the UI.
