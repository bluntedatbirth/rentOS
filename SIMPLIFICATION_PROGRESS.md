# RentOS Simplification Progress

**Goal:** Strip RentOS down to 3 core features only.
**Last updated:** 2026-04-17

---

## Decision

- [x] **Decide: strip the existing app or rebuild from scratch**
  - Recommendation: strip (see co-pilot for details)

## Remove Cut Features (one at a time, verify build after each)

- [x] Remove maintenance module
- [x] Remove penalties module
- [x] Remove documents vault / TM30
- [x] Remove notification rules engine (keep basic notification bell)
- [x] Remove billing hub / slot purchases / Pro upgrade surfaces
- [x] Remove admin tools (spend tracker, translation dashboard)
- [x] Remove beta simulation panel
- [x] Remove co-tenant management
- [x] Remove analytics module
- [x] Remove dev tools (DevToolsPanel, BugReportButton)

## Clean Up After Stripping

- [x] Clean up landlord navigation (only show: Dashboard, Properties, Contracts, Payments, Settings)
- [x] Clean up tenant navigation (only show: Dashboard, Contract, Payments, Settings)
- [x] Remove unused translation keys from en.json, th.json, zh.json
- [x] Remove or update feature flags in lib/features.ts
- [x] Clean up landlord dashboard (remove references to cut features)
- [x] Clean up tenant dashboard (remove references to cut features)

## Verify Everything Still Works

- [x] App builds without errors (`npm run build`)
- [x] Type checker passes (`npx tsc --noEmit`)
- [x] Linter passes (`npm run lint`)
- [ ] Existing tests pass (`npx vitest run`)
- [ ] Manual test: create a property (landlord side)
- [ ] Manual test: upload and process a contract (landlord side)
- [ ] Manual test: record a payment (landlord side)
- [ ] Manual test: pair a tenant
- [ ] Manual test: view contract as tenant
- [ ] Manual test: view payments as tenant
- [ ] Manual test: language switching works (Thai/English)

## Post-Simplification

- [ ] Review: is the app simple and focused?
- [ ] Deploy to Vercel and verify live site
