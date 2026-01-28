# tools/

This folder contains utility scripts used during the TypeScript migration of the UI codebase.

Purpose
- Ad-hoc find-and-replace scripts to convert `any` -> `unknown`, insert temporary stubs, and apply quick DOM casts.
- Migration helpers; not used at runtime or in production builds.

Recommended handling
- Treat these files as "migration-only" utilities. They are safe to keep in the repo for future bulk edits, but they should not be included in builds or published packages.
- Suggested actions:
  - Move to `tools/migration-scripts/` (or keep under `tools/` and mark in this README).
  - Do NOT run these scripts without reviewing their diffs — they are aggressive and can alter semantics.
  - Once migration is complete, consider archiving them to `tools/archived/` or removing them.

How to run
- From the repository root, e.g.:

```bash
node tools/auto_convert_any_unknown.js
```

Files (non-exhaustive):
- `auto_convert_any_unknown.js`
- `aggressive_dom_any_casts.js`
- `aggressive_fix_main_imports.js`
- `fix_queryselector_casts.js`
- `inject_updateActionButtons_stub.js`
- `remove_js_extensions_in_imports.js`

If you want, I can:
- Move these scripts to `tools/migration-scripts/`.
- Create a Git ignore entry or a small git attribute to mark them as not affecting CI.
