# RentOS Simplification Progress

**Goal:** Strip RentOS down to 3 core features only.
**Last updated:** 2026-04-12

---

## Decision

- [ ] **Decide: strip the existing app or rebuild from scratch**
  - Recommendation: strip (see co-pilot for details)

## Remove Cut Features (one at a time, verify build after each)

- [ ] Remove maintenance module
- [ ] Remove penalties module
- [ ] Remove documents vault / TM30
- [ ] Remove notification rules engine (keep basic notification bell)
- [ ] Remove billing hub / slot purchases / Pro upgrade surfaces
- [ ] Remove admin tools (spend tracker, translation dashboard)
- [ ] Remove beta simulation panel
- [ ] Remove co-tenant management
- [ ] Remove analytics module
- [ ] Remove dev tools (DevToolsPanel, BugReportButton)

## Clean Up After Stripping

- [ ] Clean up landlord navigation (only show: Dashboard, Properties, Contracts, Payments, Settings)
- [ ] Clean up tenant navigation (only show: Dashboard, Contract, Payments, Settings)
- [ ] Remove unused translation keys from en.json, th.json, zh.json
- [ ] Remove or update feature flags in lib/features.ts
- [ ] Clean up landlord dashboard (remove references to cut features)
- [ ] Clean up tenant dashboard (remove references to cut features)

## Verify Everything Still Works

- [ ] App builds without errors (`npm run build`)
- [ ] Type checker passes (`npx tsc --noEmit`)
- [ ] Linter passes (`npm run lint`)
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
