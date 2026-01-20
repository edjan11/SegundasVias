## API Boundary Rule (Mandatory)

Whenever implementing or modifying business logic that:
- generates outputs (print, export, save),
- processes domain data (validators, mappers),
- or may later be moved to a backend service,

you MUST:

1. Create a clear API boundary (function or interface) that abstracts the operation.
2. Keep the current implementation local, but design it as if it could be called by an HTTP API in the future.
3. Do NOT couple UI, DOM, or storage details inside this boundary.
4. Prefer pure functions or service-like modules with explicit inputs/outputs.
5. Document the boundary with a short JSDoc explaining how it could be exposed or consumed by an API.

Do NOT implement actual HTTP calls unless explicitly requested.

## Domain Reuse Rule (Mandatory)

This project implements multiple "2ª via" flows (e.g. nascimento, casamento, óbito),
which belong to the SAME domain family.

Therefore:

1. Any logic that is common across 2ª via flows MUST be implemented once and reused.
   Examples include (but are not limited to):
   - name validation and normalization
   - CPF validation
   - date and time validation/formatting
   - matrícula generation and verification
   - generic text normalization and escaping
   - shared print utilities

2. Act-specific modules (nascimento, casamento, óbito) MUST:
   - reuse shared validators, mappers, and utilities whenever possible
   - only implement truly act-specific rules and fields

3. Before creating new logic inside an act-specific folder, ALWAYS check if:
   - a similar rule already exists for another act
   - the rule can be generalized and moved to a shared/domain module

4. Shared domain logic MUST live in a neutral location (e.g. src/shared/*),
   never duplicated across acts.

5. If a rule is shared today but may diverge in the future,
   implement it as a configurable or parameterized function instead of duplicating it.

The goal is to treat all 2ª via flows as variations of the same domain,
not as independent implementations.
