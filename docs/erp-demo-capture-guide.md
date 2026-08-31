# ERP Demo Capture Guide

The protected ERP release path is outside this repository's scope. This repo must not access, inspect, copy, edit, move, or delete `C:\Users\Admin\Documents\Playground\release`.

## Safe Capture Requirement

ERP screenshots or videos may be used only after the user provides approved demo/simulation captures that contain no customer, sales, payment, private database, or real business data.

## Replacement Flow

1. Save approved compressed media in a reviewed project asset location.
2. Update `apps/site/src/content/demoAssets.ts`.
3. Keep the source label honest, for example `Approved ERP demo capture`.
4. Run site tests and build.

## What Not To Do

- Do not copy files from the protected ERP release directory.
- Do not launch the ERP against real customer/sales data for capture.
- Do not use generated fake ERP UI as if it were real.
- Do not commit raw large video without approval.
