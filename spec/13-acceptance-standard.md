# Acceptance Standard

## Purpose

Define repository-wide completion requirements for every VitaKiosk feature.

## Acceptance criteria

A feature is accepted only when:

- Its spec states observable behavior and safety constraints.
- A test was observed failing before implementation for new behavior.
- Relevant automated tests pass with no warnings treated as acceptable noise.
- Frontend behavior also passes TypeScript and production build.
- Visible work is inspected in a browser at its target viewport.
- Test evidence names the command, date, actual result, and status.
- Staged paths pass `node scripts/check-staged-files.mjs`.
- No secret or real business data is tracked.
- Mock/live provider mode and VitaFlow provenance are explicit.
- Red-flag, unknown-product, and non-invention rules remain covered.
- Shelf navigation acceptance evidence includes a screenshot of the map route panel at the target iPad landscape viewport; a plain progress stepper is not accepted.

## Test evidence

- `reports/test-evidence.md`
- `scripts/check-specs.mjs`
- Full commands listed in README Test and build section.
