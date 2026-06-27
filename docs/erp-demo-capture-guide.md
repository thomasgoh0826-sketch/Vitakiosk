# ERP Demo Capture Guide

## Protected Path

Do not access, read, inspect, modify, move, or delete:

```text
C:\Users\Admin\Documents\Playground\release
```

That directory belongs to the separate VitaFlow ERP project.

## Safe Capture Requirement

Only capture ERP screens when the screen uses demo/simulation data and contains
no customer names, sales records, payment data, private branch data, database
paths, logs, credentials, or protected source files.

If any sensitive data appears, stop and ask for a safe demo or simulation data
screen.

## Capture Targets

- dashboard
- inventory
- purchase workflow
- promotion or price monitor
- customer follow-up concept using fictional records only
- branch/product source-of-truth concept

## Usage

Replace the VitaFlow placeholder in `apps/site/src/content/demoAssets.ts` with
safe captures. Keep the manifest label and notes accurate.

Approved captures should be copied into:

```text
apps/site/public/assets/demos/vitaflow/
```

Update the corresponding `replacementPath` entry in the manifest if a filename
changes. Do not reference files from the protected ERP project directly.
