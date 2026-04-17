---
prompt: 23
title: W6A — Clients + Categories + Article form extended
sprint: S2
wave: 6
track: A
status: completed
branch: s2/w6a-clients-categories-article
session_log: "[[2026-04-17-block-W6A]]"
pr: https://github.com/eflowcr/eSTOCK/pull/17
tags: [frontend, clients, categories, articles, FC1, FC2, FC3]
completed: 2026-04-17
---

> [!success] W6A completed — 438/438 tests PASS, build OK, PR #17 targeting dev
> FC1 Clients ✅ | FC2 Categories ✅ (tree + picker) | FC3 Article form ✅ (9 campos)

## Scope
- FC1: `/clients` list + form + detail (history tabs with backend-filter deuda)
- FC2: `/categories` tree view + form + reusable `CategoryPickerComponent`
- FC3: Article form — 9 new fields (Classification, Logistics, Instructions)

## Key Decisions
- Drag-drop in tree: **deferred** — indented list with buttons
- History tabs: empty state "requires backend filter" (supplier_id/customer_id not in W3-A endpoints)
- CategoryPicker: overlay dropdown, no external lib
- W5 models/services included since s2/w5-models-services not yet merged to dev

## Results
- Tests: 438 PASS (baseline 378, +60 new)
- Build: OK (no errors)
- PR: #17 → dev
