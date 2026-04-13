# Three-Things Scope Cut — Tech Inventory

**Date:** 2026-04-11
**Author:** tech-inventory-schema-clickpaths agent
**Scope:** Landlord validation cohort — 5 real Thai landlords

---

## 1. Inventory Audit

> Legend:
>
> - **KEEP** — visible and functional in the cut
> - **HIDE** — feature-flagged OFF; route 404s to users; code stays
> - **DELETE** — already deleted or should be deleted outright
> - **Flag cluster** — logical grouping for the feature flag system (tech-flags-architect to implement)

---

### Landlord Pages (`app/landlord/*`)

| Path                                                    | Type             | KEEP/HIDE/DELETE | Rationale                                                                                                                                      | Flag cluster         |
| ------------------------------------------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `app/landlord/layout.tsx`                               | Layout           | KEEP             | Shell, nav, language toggle — core to all landlord pages. Nav items for HIDE pages will be removed by flags.                                   | —                    |
| `app/landlord/loading.tsx`                              | Loading UI       | KEEP             | Generic loading skeleton for landlord shell                                                                                                    | —                    |
| `app/landlord/error.tsx`                                | Error boundary   | KEEP             | Required P0-G fix; must stay                                                                                                                   | —                    |
| `app/landlord/dashboard/page.tsx`                       | Page             | KEEP             | 3-card dashboard is core                                                                                                                       | —                    |
| `app/landlord/dashboard/DashboardClient.tsx`            | Client component | KEEP             | Renders 3 cards (active properties, unpaid rent, contracts expiring)                                                                           | —                    |
| `app/landlord/dashboard/loading.tsx`                    | Loading UI       | KEEP             | Skeleton for dashboard                                                                                                                         | —                    |
| `app/landlord/properties/page.tsx`                      | Page             | KEEP             | Core feature — property list + CRUD                                                                                                            | —                    |
| `app/landlord/properties/loading.tsx`                   | Loading UI       | KEEP             | Skeleton for properties                                                                                                                        | —                    |
| `app/landlord/properties/[id]/page.tsx`                 | Page             | KEEP             | Property detail — core                                                                                                                         | —                    |
| `app/landlord/properties/[id]/PropertyDetailClient.tsx` | Client component | KEEP             | Property edit form + photo gallery                                                                                                             | —                    |
| `app/landlord/payments/page.tsx`                        | Page             | KEEP             | Manual payments ledger — core                                                                                                                  | —                    |
| `app/landlord/payments/loading.tsx`                     | Loading UI       | KEEP             | Skeleton for payments                                                                                                                          | —                    |
| `app/landlord/contracts/page.tsx`                       | Page             | KEEP             | Contract list — core                                                                                                                           | —                    |
| `app/landlord/contracts/upload/page.tsx`                | Page             | KEEP             | Upload PDF + trigger OCR — core loop                                                                                                           | —                    |
| `app/landlord/contracts/[id]/page.tsx`                  | Page             | KEEP             | Contract detail + clause view + reparse + pairing code                                                                                         | —                    |
| `app/landlord/contracts/[id]/pair/page.tsx`             | Page             | KEEP             | Generate pairing code for tenant                                                                                                               | —                    |
| `app/landlord/contracts/create/page.tsx`                | Page             | HIDE             | Uses `/api/contracts/generate` (AI template generation). Could be argued core if PO wants template-based creation; flagged for PO input below. | `contracts-ai`       |
| `app/landlord/contracts/create/loading.tsx`             | Loading UI       | HIDE             | Belongs to hidden create page                                                                                                                  | `contracts-ai`       |
| `app/landlord/contracts/templates/page.tsx`             | Page             | HIDE             | Template library — requires contract_templates table; out of scope for cut                                                                     | `contracts-ai`       |
| `app/landlord/contracts/[id]/renew/page.tsx`            | Page             | HIDE             | Renewal flow calls `/api/contracts/[id]/analyze` and uses UpgradePrompt. Complex feature, not in core three things.                            | `contracts-renewal`  |
| `app/landlord/notifications/inbox/page.tsx`             | Page             | KEEP             | Notification inbox — KEEP (payment_due + lease_expiry types are on by default)                                                                 | —                    |
| `app/landlord/notifications/page.tsx`                   | Page             | KEEP             | Notification list                                                                                                                              | —                    |
| `app/landlord/notifications/loading.tsx`                | Loading UI       | KEEP             | Skeleton                                                                                                                                       | —                    |
| `app/landlord/notifications/rules/page.tsx`             | Page             | HIDE             | Custom notification rule chains — replaced by 2 hardcoded defaults                                                                             | `notification-rules` |
| `app/landlord/onboarding/page.tsx`                      | Page             | KEEP             | Onboarding flow for new landlords — core UX                                                                                                    | —                    |
| `app/landlord/profile/page.tsx`                         | Page             | KEEP             | Profile edit (name, phone, language)                                                                                                           | —                    |
| `app/landlord/settings/page.tsx`                        | Page             | KEEP             | Settings — language + notification prefs                                                                                                       | —                    |
| `app/landlord/settings/loading.tsx`                     | Loading UI       | KEEP             | Skeleton                                                                                                                                       | —                    |
| `app/landlord/security/page.tsx`                        | Page             | KEEP             | Email change, password reset, account delete — required for user safety                                                                        | —                    |
| `app/landlord/analytics/page.tsx`                       | Page             | HIDE             | Full analytics dashboard — beyond 3 simple cards                                                                                               | `analytics`          |
| `app/landlord/analytics/AnalyticsClient.tsx`            | Client component | HIDE             | Uses UpgradePrompt; Pro-gated analytics                                                                                                        | `analytics`          |
| `app/landlord/documents/page.tsx`                       | Page             | HIDE             | Document vault — Pro-gated, not in three things                                                                                                | `documents`          |
| `app/landlord/documents/DocumentsClient.tsx`            | Client component | HIDE             | Uses UpgradePrompt; TM30 link inside                                                                                                           | `documents`          |
| `app/landlord/documents/tm30/page.tsx`                  | Page             | HIDE             | TM30 filing — explicitly out of scope                                                                                                          | `tm30`               |
| `app/landlord/maintenance/page.tsx`                     | Page             | HIDE             | Maintenance requests — not in three things. See PO input below.                                                                                | `maintenance`        |
| `app/landlord/maintenance/MaintenanceClient.tsx`        | Client component | HIDE             | Maintenance UI                                                                                                                                 | `maintenance`        |
| `app/landlord/maintenance/loading.tsx`                  | Loading UI       | HIDE             | Belongs to hidden maintenance page                                                                                                             | `maintenance`        |
| `app/landlord/penalties/page.tsx`                       | Page             | HIDE             | Penalty system — explicitly out of scope                                                                                                       | `penalties`          |
| `app/landlord/penalties/PenaltiesClient.tsx`            | Client component | HIDE             | Penalty list + actions                                                                                                                         | `penalties`          |
| `app/landlord/penalties/loading.tsx`                    | Loading UI       | HIDE             | Belongs to hidden penalties page                                                                                                               | `penalties`          |
| `app/landlord/penalties/rules/page.tsx`                 | Page             | HIDE             | Penalty rules CRUD                                                                                                                             | `penalties`          |
| `app/landlord/billing/page.tsx`                         | Page             | HIDE             | Billing dashboard — Pro/slot upsell                                                                                                            | `billing`            |
| `app/landlord/billing/slots/page.tsx`                   | Page             | HIDE             | Slot packs purchase page                                                                                                                       | `billing`            |
| `app/landlord/billing/slots/SlotsClient.tsx`            | Client component | HIDE             | Slots client + PostSlotProUpsellModal                                                                                                          | `billing`            |
| `app/landlord/billing/upgrade/page.tsx`                 | Page             | HIDE             | Pro upgrade page                                                                                                                               | `billing`            |

---

### Tenant Pages (`app/tenant/*`)

| Path                                                 | Type             | KEEP/HIDE/DELETE | Rationale                                                             | Flag cluster  |
| ---------------------------------------------------- | ---------------- | ---------------- | --------------------------------------------------------------------- | ------------- |
| `app/tenant/layout.tsx`                              | Layout           | KEEP             | Wraps TenantShell                                                     | —             |
| `app/tenant/TenantShell.tsx`                         | Shell/Layout     | KEEP             | Nav, language toggle, auth check                                      | —             |
| `app/tenant/loading.tsx`                             | Loading UI       | KEEP             | Root tenant loading skeleton                                          | —             |
| `app/tenant/error.tsx`                               | Error boundary   | KEEP             | P0-G fix; required                                                    | —             |
| `app/tenant/onboarding/page.tsx`                     | Page             | KEEP             | Tenant onboarding — core                                              | —             |
| `app/tenant/pair/page.tsx`                           | Page             | KEEP             | Enter pairing code → link to contract                                 | —             |
| `app/tenant/dashboard/page.tsx`                      | Page             | KEEP             | Tenant dashboard                                                      | —             |
| `app/tenant/dashboard/DashboardClient.tsx`           | Client component | KEEP             | Tenant dashboard cards                                                | —             |
| `app/tenant/dashboard/loading.tsx`                   | Loading UI       | KEEP             | Skeleton                                                              | —             |
| `app/tenant/contract/view/page.tsx`                  | Page             | KEEP             | View own contract + clauses + lease dates                             | —             |
| `app/tenant/payments/page.tsx`                       | Page             | KEEP             | Payment list + "I've paid" button                                     | —             |
| `app/tenant/payments/loading.tsx`                    | Loading UI       | KEEP             | Skeleton                                                              | —             |
| `app/tenant/notifications/page.tsx`                  | Page             | KEEP             | Notification inbox                                                    | —             |
| `app/tenant/notifications/loading.tsx`               | Loading UI       | KEEP             | Skeleton                                                              | —             |
| `app/tenant/notifications/settings/page.tsx`         | Page             | KEEP             | Notification preferences                                              | —             |
| `app/tenant/profile/page.tsx`                        | Page             | KEEP             | Profile edit                                                          | —             |
| `app/tenant/settings/page.tsx`                       | Page             | KEEP             | Settings (canonical profile + language)                               | —             |
| `app/tenant/settings/loading.tsx`                    | Loading UI       | KEEP             | Skeleton                                                              | —             |
| `app/tenant/security/page.tsx`                       | Page             | KEEP             | Email change, account delete                                          | —             |
| `app/tenant/co-tenants/page.tsx`                     | Page             | HIDE             | Co-tenant management — not in three things scope. See PO input below. | `co-tenants`  |
| `app/tenant/documents/page.tsx`                      | Page             | HIDE             | Document vault (tenant-side) — not in three things                    | `documents`   |
| `app/tenant/documents/TenantDocumentsClient.tsx`     | Client component | HIDE             | Tenant documents UI                                                   | `documents`   |
| `app/tenant/maintenance/page.tsx`                    | Page             | HIDE             | Maintenance requests — not in three things. See PO input below.       | `maintenance` |
| `app/tenant/maintenance/TenantMaintenanceClient.tsx` | Client component | HIDE             | Maintenance UI                                                        | `maintenance` |
| `app/tenant/maintenance/loading.tsx`                 | Loading UI       | HIDE             | Belongs to hidden maintenance                                         | `maintenance` |
| `app/tenant/penalties/appeal/page.tsx`               | Page             | HIDE             | Penalty appeal — explicitly out of scope                              | `penalties`   |
| `app/tenant/penalties/loading.tsx`                   | Loading UI       | HIDE             | Belongs to hidden penalties                                           | `penalties`   |

---

### Public Pages (`app/(public)/*` and `app/auth/*`)

| Path                                                   | Type      | KEEP/HIDE/DELETE | Rationale                                                                                                | Flag cluster |
| ------------------------------------------------------ | --------- | ---------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `app/(public)/login/page.tsx`                          | Page      | KEEP             | Auth — core                                                                                              | —            |
| `app/(public)/login/layout.tsx`                        | Layout    | KEEP             | Login shell                                                                                              | —            |
| `app/(public)/login/components/ForgotPasswordLink.tsx` | Component | KEEP             | Part of login                                                                                            | —            |
| `app/(public)/signup/page.tsx`                         | Page      | KEEP             | Auth — core                                                                                              | —            |
| `app/(public)/signup/layout.tsx`                       | Layout    | KEEP             | Signup shell                                                                                             | —            |
| `app/auth/reset-password/page.tsx`                     | Page      | KEEP             | Password reset landing — required for users who chose password auth; invoked from magic-link email token | —            |

---

### Admin Pages (`app/admin/*`)

| Path                                                 | Type             | KEEP/HIDE/DELETE | Rationale                                                          | Flag cluster |
| ---------------------------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------ | ------------ |
| `app/admin/spend/page.tsx`                           | Page             | KEEP             | AI spend dashboard — internal monitoring, not user-facing          | —            |
| `app/admin/translations/page.tsx`                    | Page             | KEEP             | Translation report review — internal tool for bad-translation loop | —            |
| `app/admin/translations/AdminTranslationsClient.tsx` | Client component | KEEP             | Admin translations UI                                              | —            |

---

### App Root

| Path                       | Type           | KEEP/HIDE/DELETE | Rationale                                                                    | Flag cluster |
| -------------------------- | -------------- | ---------------- | ---------------------------------------------------------------------------- | ------------ |
| `app/page.tsx`             | Landing page   | KEEP             | Public landing with PricingToggle and FAQAccordion — marketing surface       | —            |
| `app/layout.tsx`           | Root layout    | KEEP             | Root HTML shell, providers                                                   | —            |
| `app/error.tsx`            | Error boundary | KEEP             | P0-G fix; required                                                           | —            |
| `app/not-found.tsx`        | 404 page       | KEEP             | Required for hidden routes returning 404                                     | —            |
| `app/maintenance/page.tsx` | Page           | KEEP             | Fail-closed maintenance page (middleware redirects here if env vars missing) | —            |
| `app/legal/`               | Legal pages    | KEEP             | Privacy policy / ToS — required for public signup                            | —            |
| `app/providers.tsx`        | Providers      | KEEP             | Auth + i18n providers                                                        | —            |

---

### API Routes (`app/api/*`)

| Path                                                | Type | KEEP/HIDE/DELETE | Rationale                                                             | Flag cluster         |
| --------------------------------------------------- | ---- | ---------------- | --------------------------------------------------------------------- | -------------------- |
| `app/api/auth/magic-link/route.ts`                  | API  | KEEP             | Auth flow                                                             | —                    |
| `app/api/auth/password-reset/route.ts`              | API  | KEEP             | Auth flow                                                             | —                    |
| `app/api/account/delete/route.ts`                   | API  | KEEP             | Account deletion — security requirement                               | —                    |
| `app/api/account/email/route.ts`                    | API  | KEEP             | Email change — security                                               | —                    |
| `app/api/profile/route.ts`                          | API  | KEEP             | Profile read/update                                                   | —                    |
| `app/api/profile/language/route.ts`                 | API  | KEEP             | Language preference sync                                              | —                    |
| `app/api/properties/route.ts`                       | API  | KEEP             | Properties CRUD                                                       | —                    |
| `app/api/properties/[id]/route.ts`                  | API  | KEEP             | Single property CRUD                                                  | —                    |
| `app/api/properties/[id]/images/route.ts`           | API  | KEEP             | Property photo upload                                                 | —                    |
| `app/api/properties/[id]/images/[imageId]/route.ts` | API  | KEEP             | Single image delete                                                   | —                    |
| `app/api/contracts/route.ts`                        | API  | KEEP             | Contract list (explicit columns — P1-K fix)                           | —                    |
| `app/api/contracts/upload/route.ts`                 | API  | KEEP             | Contract PDF upload → OCR trigger                                     | —                    |
| `app/api/contracts/[id]/route.ts`                   | API  | KEEP             | Contract detail CRUD                                                  | —                    |
| `app/api/contracts/[id]/reparse/route.ts`           | API  | KEEP             | Reparse OCR — core loop                                               | —                    |
| `app/api/contracts/[id]/activate/route.ts`          | API  | KEEP             | Activate contract after parse                                         | —                    |
| `app/api/contracts/[id]/co-tenants/route.ts`        | API  | HIDE             | Co-tenant management                                                  | `co-tenants`         |
| `app/api/contracts/[id]/renew/route.ts`             | API  | HIDE             | Renewal offer                                                         | `contracts-renewal`  |
| `app/api/contracts/[id]/renew-respond/route.ts`     | API  | HIDE             | Tenant renewal response                                               | `contracts-renewal`  |
| `app/api/contracts/[id]/qa/route.ts`                | API  | HIDE             | Contract Q&A (AI)                                                     | `contracts-ai`       |
| `app/api/contracts/[id]/analyze/route.ts`           | API  | HIDE             | Contract AI analysis                                                  | `contracts-ai`       |
| `app/api/contracts/compare/route.ts`                | API  | HIDE             | Contract comparison (AI)                                              | `contracts-ai`       |
| `app/api/contracts/suggest-clauses/route.ts`        | API  | HIDE             | AI clause suggestions                                                 | `contracts-ai`       |
| `app/api/contracts/generate/route.ts`               | API  | HIDE             | AI-assisted template generation. See PO input below — could be KEEP.  | `contracts-ai`       |
| `app/api/contracts/backfill-payments/route.ts`      | API  | KEEP             | Backfills payment rows from contract — needed when contract activates | —                    |
| `app/api/contract-templates/route.ts`               | API  | HIDE             | Template library list                                                 | `contracts-ai`       |
| `app/api/contract-templates/[id]/route.ts`          | API  | HIDE             | Single template read                                                  | `contracts-ai`       |
| `app/api/payments/route.ts`                         | API  | KEEP             | Payment list + create                                                 | —                    |
| `app/api/payments/[id]/route.ts`                    | API  | KEEP             | Single payment update                                                 | —                    |
| `app/api/payments/[id]/claim/route.ts`              | API  | KEEP             | Tenant "I've paid" claim                                              | —                    |
| `app/api/payments/[id]/confirm/route.ts`            | API  | KEEP             | Landlord confirm payment                                              | —                    |
| `app/api/payments/[id]/receipt/route.ts`            | API  | KEEP             | Payment receipt download                                              | —                    |
| `app/api/pairing/generate/route.ts`                 | API  | KEEP             | Generate pairing code                                                 | —                    |
| `app/api/pairing/redeem/route.ts`                   | API  | KEEP             | Tenant redeems code                                                   | —                    |
| `app/api/pairing/co-tenant/route.ts`                | API  | HIDE             | Co-tenant pairing                                                     | `co-tenants`         |
| `app/api/notifications/route.ts`                    | API  | KEEP             | Notification list                                                     | —                    |
| `app/api/notifications/count/route.ts`              | API  | KEEP             | Unread count                                                          | —                    |
| `app/api/notifications/[id]/read/route.ts`          | API  | KEEP             | Mark read                                                             | —                    |
| `app/api/notifications/[id]/dismiss/route.ts`       | API  | KEEP             | Dismiss                                                               | —                    |
| `app/api/notifications/read-all/route.ts`           | API  | KEEP             | Mark all read                                                         | —                    |
| `app/api/notifications/dismiss-all/route.ts`        | API  | KEEP             | Dismiss all                                                           | —                    |
| `app/api/notifications/dismiss-by-url/route.ts`     | API  | KEEP             | Dismiss by URL                                                        | —                    |
| `app/api/notifications/fcm-token/route.ts`          | API  | KEEP             | Register FCM push token                                               | —                    |
| `app/api/notifications/send/route.ts`               | API  | KEEP             | Send notification (used by cron)                                      | —                    |
| `app/api/notification-rules/route.ts`               | API  | HIDE             | Custom notification rule CRUD                                         | `notification-rules` |
| `app/api/notification-rules/[id]/route.ts`          | API  | HIDE             | Single rule CRUD                                                      | `notification-rules` |
| `app/api/bulk/notifications/route.ts`               | API  | KEEP             | Bulk notification ops (used by cron)                                  | —                    |
| `app/api/bulk/payments/route.ts`                    | API  | KEEP             | Bulk payment ops (used by cron)                                       | —                    |
| `app/api/bulk/penalties/route.ts`                   | API  | HIDE             | Bulk penalty ops — penalty system hidden                              | `penalties`          |
| `app/api/cron/daily/route.ts`                       | API  | KEEP             | Daily cron — sends payment_due + lease_expiry notifications           | —                    |
| `app/api/ocr/route.ts`                              | API  | KEEP             | OCR endpoint — load-bearing for contract core loop                    | —                    |
| `app/api/penalties/route.ts`                        | API  | HIDE             | Penalty list/create                                                   | `penalties`          |
| `app/api/penalties/[id]/route.ts`                   | API  | HIDE             | Single penalty CRUD + landlord review                                 | `penalties`          |
| `app/api/penalties/[id]/appeal/route.ts`            | API  | HIDE             | Tenant appeal                                                         | `penalties`          |
| `app/api/penalties/calculate/route.ts`              | API  | HIDE             | AI penalty calculation                                                | `penalties`          |
| `app/api/penalty-rules/route.ts`                    | API  | HIDE             | Penalty rule CRUD                                                     | `penalties`          |
| `app/api/penalty-rules/[id]/route.ts`               | API  | HIDE             | Single penalty rule                                                   | `penalties`          |
| `app/api/documents/route.ts`                        | API  | HIDE             | Document vault list/upload                                            | `documents`          |
| `app/api/documents/[id]/route.ts`                   | API  | HIDE             | Single document CRUD                                                  | `documents`          |
| `app/api/maintenance/route.ts`                      | API  | HIDE             | Maintenance requests list/create                                      | `maintenance`        |
| `app/api/maintenance/[id]/route.ts`                 | API  | HIDE             | Single maintenance request CRUD                                       | `maintenance`        |
| `app/api/tm30/generate/route.ts`                    | API  | HIDE             | TM30 filing generation                                                | `tm30`               |
| `app/api/billing/checkout/route.ts`                 | API  | HIDE             | Pro subscription checkout                                             | `billing`            |
| `app/api/billing/cancel/route.ts`                   | API  | HIDE             | Cancel Pro                                                            | `billing`            |
| `app/api/billing/status/route.ts`                   | API  | HIDE             | Billing status check                                                  | `billing`            |
| `app/api/billing/slots/checkout/route.ts`           | API  | HIDE             | Slot pack checkout                                                    | `billing`            |
| `app/api/billing/slots/callback/route.ts`           | API  | HIDE             | Omise payment callback                                                | `billing`            |
| `app/api/analytics/route.ts`                        | API  | HIDE             | Full analytics data                                                   | `analytics`          |
| `app/api/admin/spend/route.ts`                      | API  | KEEP             | Internal AI spend monitor                                             | —                    |
| `app/api/bug-reports/route.ts`                      | API  | KEEP             | Bug report submission                                                 | —                    |
| `app/api/translation-reports/route.ts`              | API  | KEEP             | Translation report submission                                         | —                    |
| `app/api/translation-reports/[id]/review/route.ts`  | API  | KEEP             | Admin translation review                                              | —                    |
| `app/api/beta/simulate/route.ts`                    | API  | HIDE             | Beta simulation panel — dev tooling, not for real users               | `dev-tools`          |
| `app/api/debug/auth-state/route.ts`                 | API  | HIDE             | Auth debug endpoint — not for production users. See note below.       | `dev-tools`          |

---

### Gating / Feature-Specific Components (`components/*`)

| Path                                            | Type      | KEEP/HIDE/DELETE | Rationale                                                                                     | Flag cluster        |
| ----------------------------------------------- | --------- | ---------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `components/ui/UpgradePrompt.tsx`               | Component | HIDE             | Pro upsell modal — entire billing/pro tier is hidden. Component stays, callers are hidden.    | `billing`           |
| `components/ui/ProBadge.tsx`                    | Component | HIDE             | Pro badge indicator — used alongside Pro gating                                               | `billing`           |
| `components/ui/ProRibbon.tsx`                   | Component | HIDE             | Pro ribbon decorator                                                                          | `billing`           |
| `components/billing/PostSlotProUpsellModal.tsx` | Component | HIDE             | Slot pack upsell modal — billing hidden                                                       | `billing`           |
| `components/beta/SimulationPanel.tsx`           | Component | HIDE             | Beta simulation dev tool (env-gated already, but hidden in cut)                               | `dev-tools`         |
| `components/dev/DevToolsPanel.tsx`              | Component | HIDE             | Dev tools panel — not for real users                                                          | `dev-tools`         |
| `components/dev/TranslationReporter.tsx`        | Component | KEEP             | Bad-translation report button — keep in UI for real user feedback                             | —                   |
| `components/landlord/ContractAnalysis.tsx`      | Component | HIDE             | Renders AI analysis results (risks, missing clauses) — AI feature                             | `contracts-ai`      |
| `components/landlord/TemplateStartStep.tsx`     | Component | HIDE             | Template selection step in contract create — tied to hidden generate flow                     | `contracts-ai`      |
| `components/landlord/ContractClauseCard.tsx`    | Component | KEEP             | Renders parsed clauses — core contract view                                                   | —                   |
| `components/landlord/PdfPreview.tsx`            | Component | KEEP             | PDF preview in contract detail                                                                | —                   |
| `components/landlord/PropertyCard.tsx`          | Component | KEEP             | Property card in list                                                                         | —                   |
| `components/landlord/PropertyImageGallery.tsx`  | Component | KEEP             | Photo gallery with next/image (P1-H fix)                                                      | —                   |
| `components/landlord/RenewalBanner.tsx`         | Component | HIDE             | Renewal prompt banner — renewal flow is hidden                                                | `contracts-renewal` |
| `components/tenant/RenewalNotice.tsx`           | Component | HIDE             | Tenant-side renewal notice                                                                    | `contracts-renewal` |
| `components/landing/PricingToggle.tsx`          | Component | HIDE             | Pricing toggle on landing page — billing hidden; but landing page itself stays. See PO input. | `billing`           |
| `components/landing/FAQAccordion.tsx`           | Component | KEEP             | FAQ on landing page                                                                           | —                   |
| `components/auth/SocialLoginButtons.tsx`        | Component | KEEP             | Auth social login                                                                             | —                   |
| `components/auth/SocialProviderIcon.tsx`        | Component | KEEP             | Icon helper for social auth                                                                   | —                   |
| `components/profile/ProfileForm.tsx`            | Component | KEEP             | Profile edit form                                                                             | —                   |
| `components/pwa/InstallPrompt.tsx`              | Component | KEEP             | PWA install prompt                                                                            | —                   |
| `components/pwa/PWAProvider.tsx`                | Component | KEEP             | PWA context                                                                                   | —                   |
| `components/security/SecuritySettings.tsx`      | Component | KEEP             | Security settings form                                                                        | —                   |
| `components/ui/BottomNav.tsx`                   | Component | KEEP             | Mobile nav bar                                                                                | —                   |
| `components/ui/SideNav.tsx`                     | Component | KEEP             | Desktop side nav                                                                              | —                   |
| `components/ui/MoreSheet.tsx`                   | Component | KEEP             | "More" bottom sheet                                                                           | —                   |
| `components/ui/NotificationBell.tsx`            | Component | KEEP             | Notification bell with badge                                                                  | —                   |
| `components/ui/NotificationBadge.tsx`           | Component | KEEP             | Badge count indicator                                                                         | —                   |
| `components/ui/BugReportButton.tsx`             | Component | KEEP             | Bug report trigger                                                                            | —                   |
| `components/ui/LanguageToggle.tsx`              | Component | KEEP             | EN/TH language toggle                                                                         | —                   |
| `components/ui/Card.tsx`                        | Component | KEEP             | Generic card UI primitive                                                                     | —                   |
| `components/ui/LoadingSkeleton.tsx`             | Component | KEEP             | Skeleton loader                                                                               | —                   |
| `components/ui/StatusBadge.tsx`                 | Component | KEEP             | Status chip (pending, paid, etc.)                                                             | —                   |
| `components/ui/Toast.tsx`                       | Component | KEEP             | Toast notification                                                                            | —                   |
| `components/ui/ToastProvider.tsx`               | Component | KEEP             | Toast context                                                                                 | —                   |
| `components/ui/TopDownNotification.tsx`         | Component | KEEP             | Top-of-screen notification banner                                                             | —                   |

---

### Summary Counts

| Bucket                | Count                                              |
| --------------------- | -------------------------------------------------- |
| KEEP                  | 83                                                 |
| HIDE                  | 61                                                 |
| DELETE                | 0 (all prior deletes already done in audit sprint) |
| **Total inventoried** | **144**                                            |

---

## 2. Schema Freeze

### Tables

| Table                  | Label  | Notes                                                                  |
| ---------------------- | ------ | ---------------------------------------------------------------------- |
| `profiles`             | ACTIVE | Core to auth, properties, contracts, payments, notifications           |
| `properties`           | ACTIVE | Core feature                                                           |
| `property_images`      | ACTIVE | Photo upload — core                                                    |
| `contracts`            | ACTIVE | Core feature; state machine columns all used                           |
| `payments`             | ACTIVE | Core feature                                                           |
| `notifications`        | ACTIVE | payment_due + lease_expiry types are on by default                     |
| `maintenance_requests` | FROZEN | Written/read only by hidden maintenance feature                        |
| `penalties`            | FROZEN | Written/read only by hidden penalty system                             |
| `penalty_rules`        | FROZEN | Written/read only by hidden penalty rules                              |
| `notification_rules`   | FROZEN | Written/read only by hidden notification rule chains                   |
| `contract_analyses`    | FROZEN | Written/read only by hidden AI analysis feature                        |
| `contract_templates`   | FROZEN | Written/read only by hidden template/generate feature                  |
| `documents`            | FROZEN | Written/read only by hidden document vault                             |
| `slot_purchases`       | FROZEN | Written/read only by hidden billing/slot feature                       |
| `ai_rate_limits`       | FROZEN | Only written by hidden AI endpoints (qa, analyze, calculate, generate) |
| `ai_spend_log`         | FROZEN | Only written by hidden AI endpoints                                    |
| `translation_reports`  | ACTIVE | Used by keep: bad-translation reporter + admin review tool             |

> Note: `ai_rate_limits` and `ai_spend_log` back the AI endpoint rate limiter. All AI endpoints that write to them (`/api/contracts/[id]/qa`, `/api/contracts/[id]/analyze`, `/api/penalties/calculate`, `/api/contracts/generate`) are HIDE. FROZEN is correct. If any KEEP endpoint uses AI in future it will need rate limiting wired back in.

### Profile-Level Columns Tied to Hidden Features

| Column                     | Table      | Label  | Notes                                                                                              |
| -------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------- |
| `tier`                     | `profiles` | FROZEN | `free`/`pro` check — billing hidden; schema stays intact                                           |
| `omise_customer_id`        | `profiles` | FROZEN | Billing — stays                                                                                    |
| `omise_schedule_id`        | `profiles` | FROZEN | Billing — stays                                                                                    |
| `tier_expires_at`          | `profiles` | FROZEN | Billing — stays                                                                                    |
| `billing_cycle`            | `profiles` | FROZEN | Billing — stays                                                                                    |
| `purchased_slots`          | `profiles` | FROZEN | Slot packs — stays                                                                                 |
| `founding_member`          | `profiles` | FROZEN | Founding member pricing tag — DB column kept for later; UI entry point hidden                      |
| `language` (zh value)      | `profiles` | FROZEN | ZH-CN in constraint stays; language switcher removes ZH option. Column itself is ACTIVE for th/en. |
| `notification_preferences` | `profiles` | ACTIVE | Used by KEEP notification settings page                                                            |

### Contract-Level Columns Tied to Hidden Features

| Column               | Table       | Label  | Notes                       |
| -------------------- | ----------- | ------ | --------------------------- |
| `renewed_from`       | `contracts` | FROZEN | Renewal flow hidden         |
| `renewal_changes`    | `contracts` | FROZEN | Renewal flow hidden         |
| `pairing_code`       | `contracts` | ACTIVE | Used by KEEP tenant pairing |
| `pairing_expires_at` | `contracts` | ACTIVE | Used by KEEP tenant pairing |
| `co_tenants`         | `contracts` | FROZEN | Co-tenant feature hidden    |

---

## 3. Click-Path Test List

> Convention: all steps are UI actions on a mobile device (or mobile-size browser window). No API calls, no curl, no cron triggers. One action per line.

---

### Landlord Click-Paths

#### L-1: Sign up

1. Open the app URL in a mobile browser
2. Tap "Sign up"
3. Enter email address and tap "Continue"
4. Open email inbox, find the magic-link email, tap the link
5. Confirm you land on the landlord onboarding page
6. Enter full name and tap "Save"
7. Confirm you land on the landlord dashboard

#### L-2: Sign in (returning user)

1. Open the app URL
2. Tap "Log in"
3. Enter email and tap "Continue"
4. Open email inbox, tap the magic-link
5. Confirm you land on the landlord dashboard

#### L-3: Language toggle EN ↔ TH

1. From any landlord page, locate the language toggle button in the top-right header (shows "EN" or "TH")
2. Tap the toggle button
3. Confirm all visible text switches language
4. Tap again
5. Confirm text switches back
6. Confirm there is NO "ZH" or Chinese option visible anywhere

#### L-4: Create property with photo upload

1. From the dashboard, tap "Properties" in the bottom nav
2. Tap the "Add property" button
3. Enter property name and address
4. Tap "Save" or "Create"
5. Confirm the new property appears in the property list
6. Tap the property to open its detail page
7. Tap "Upload photo" (or equivalent)
8. Select a photo from device library (choose a large image >1 MB)
9. Confirm the photo appears in the gallery after upload
10. Confirm the displayed file size or a compression indicator shows the image was compressed (or tap the image and check that it loads via the Supabase transform URL)

#### L-5: Edit property

1. From the properties list, tap a property
2. Tap "Edit"
3. Change the property name
4. Tap "Save"
5. Confirm the updated name appears on the property detail page and in the list

#### L-6: Delete property

1. From the properties list, tap a property
2. Tap "Edit" then "Delete" (or long-press for delete action)
3. Confirm a deletion confirmation dialog appears
4. Confirm deletion
5. Confirm the property no longer appears in the list

#### L-7: Upload contract PDF → OCR completes → view parsed clauses

1. From the properties list, tap a property
2. Navigate to "Contracts" or tap "Upload contract"
3. Select a PDF file from device storage
4. Tap "Upload"
5. Wait for the OCR spinner to complete (may take 10–30 seconds)
6. Confirm contract status changes from "pending" to "active" (or "parse_failed" if OCR fails — see L-8)
7. Tap the contract to open its detail page
8. Confirm parsed clauses are listed (monthly rent, lease dates, deposit visible)

#### L-8: Reparse contract

1. Open a contract detail page
2. Locate the "Reparse" button
3. Tap "Reparse"
4. Confirm a spinner appears while reparsing
5. Confirm the clauses list updates after parsing completes

#### L-9: View contract detail page

1. From the contracts list (or via the property detail), tap a contract
2. Confirm the following are visible: original PDF preview (or download link), structured clauses, lease start date, lease end date, monthly rent
3. Confirm the "Pairing code" section is visible on the same page (or via a dedicated "Pair tenant" button)

#### L-10: Lease expiry banner when <= 30 days

1. Using a contract whose `lease_end` date is within 30 days of today (create one or update via Supabase dashboard)
2. Navigate to the contract detail page
3. Confirm a yellow/amber expiry warning banner is visible on the page
4. Navigate to the main dashboard
5. Confirm the "Contracts expiring soon" card shows a count > 0

#### L-11: Generate pairing code and share with tenant

1. Open a contract detail page
2. Tap "Generate pairing code" (or "Pair tenant")
3. Confirm a 6- or 8-character code is displayed
4. Tap "Copy" or "Share"
5. Confirm the code is copied to clipboard (or share sheet appears)

#### L-12: Mark a payment as paid (landlord-confirm)

1. Navigate to "Payments" in the bottom nav
2. Find a payment with status "pending" or "claimed"
3. Tap "Mark as paid" or "Confirm"
4. Confirm the payment status changes to "paid"
5. Confirm the "Unpaid rent" card count on the dashboard decreases

#### L-13: Dashboard renders exactly 3 cards

1. Navigate to the dashboard
2. Count the stat cards displayed
3. Confirm exactly 3 cards exist: "Active properties", "Unpaid rent", "Contracts expiring soon"
4. Confirm no other analytics widgets, charts, or extra cards are visible

#### L-14: Verify hidden features return 404

1. In the mobile browser address bar, manually type: `[app-url]/api/contracts/compare`
2. Tap Go / Enter
3. Confirm the response is a 404 (not found) page or JSON `{"error": "Not Found"}`
4. Confirm you are NOT redirected to a login page or an error page that leaks route details

---

### Tenant Click-Paths

#### T-1: Sign up

1. Open the app URL in a mobile browser
2. Tap "Sign up"
3. Enter email and select role "Tenant"
4. Follow magic-link email
5. Confirm you land on the tenant onboarding page
6. Enter full name and tap "Save"
7. Confirm you land on the tenant dashboard

#### T-2: Sign in (returning user)

1. Open the app URL
2. Tap "Log in"
3. Enter email, follow magic-link
4. Confirm you land on the tenant dashboard

#### T-3: Pair with landlord code

1. From the tenant dashboard or via "More" → "Pair", tap "Enter pairing code"
2. Type the 6- or 8-character code provided by the landlord
3. Tap "Submit" or "Pair"
4. Confirm a success message appears
5. Navigate to "My Contract" in the bottom nav
6. Confirm the contract is now visible with parsed clauses

#### T-4: View contract detail

1. Tap "My Contract" in the bottom nav
2. Confirm lease dates (start, end) are visible
3. Confirm monthly rent is visible
4. Confirm parsed clauses are listed
5. If lease end is within 30 days, confirm the lease expiry banner is visible

#### T-5: Click "I've paid" on a pending payment → landlord sees pending-confirm

1. Navigate to "Payments" in the bottom nav
2. Find a payment with status "pending"
3. Tap "I've paid"
4. Confirm the payment status on the tenant side changes to "claimed" or "pending confirmation"
5. (Switch to a landlord session) Navigate to Payments
6. Confirm the same payment now shows status "claimed" awaiting landlord confirmation

#### T-6: View payment list

1. Navigate to "Payments" in the bottom nav
2. Confirm a list of payments is displayed with amounts, due dates, and statuses
3. Confirm overdue payments show a visual indicator (red/amber)

#### T-7: Lease expiry banner (tenant)

1. With a contract whose `lease_end` is within 30 days of today
2. Navigate to "My Contract"
3. Confirm a lease expiry warning banner is displayed

#### T-8: Language toggle EN ↔ TH

1. From any tenant page, locate the language toggle in the top-right header
2. Tap to switch language
3. Confirm UI text switches
4. Tap again to switch back
5. Confirm no "ZH" option is visible in the toggle or any settings menu

---

## Needs PO Input

| Item                                                                         | Default bucket                      | Rationale                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/landlord/contracts/create/page.tsx` + `/api/contracts/generate`         | **HIDE**                            | Contract creation currently requires AI template generation. If PO wants landlords to create contracts from scratch without AI, this page could be simplified to a plain form (no AI). Alternatively, landlords can upload PDFs instead. Proposed default: HIDE — landlords upload existing contracts; create-from-template is a future Pro feature. |
| `app/tenant/maintenance/page.tsx` + `app/landlord/maintenance/page.tsx`      | **HIDE**                            | Maintenance is not in the "Three Things" keep list, but the tenant nav and landlord nav both expose it today. It is functional. If the validation cohort will expect it as a standard landlord tool, it could be KEEP at low polish. Proposed default: HIDE — simplify the surface for validation; re-add after.                                     |
| `app/tenant/co-tenants/page.tsx` + `/api/contracts/[id]/co-tenants/route.ts` | **HIDE**                            | Co-tenant management is not in the three things scope. Most Thai landlords in validation cohort will likely have single-tenant contracts. Proposed default: HIDE.                                                                                                                                                                                    |
| `components/landing/PricingToggle.tsx` on `app/page.tsx`                     | **HIDE** (remove from landing page) | The landing page is KEEP for "Free for landlords" messaging, but showing slot pack pricing while the billing system is hidden is misleading. Remove PricingToggle from the landing page composition; keep the component file.                                                                                                                        |
| `app/api/debug/auth-state/route.ts`                                          | **DELETE**                          | This is a debug route that exposes auth state. It was not deleted in the P0-E audit (which only removed `app/api/dev/`). Should this be deleted outright, or is it guarded? Proposed default: DELETE — it has no legitimate user-facing purpose and was not in the original dev routes folder only by accident.                                      |
| `app/api/contracts/backfill-payments/route.ts`                               | **KEEP**                            | Not clearly in KEEP or HIDE lists but is called internally when a contract activates to seed payment rows. It is load-bearing for the payments flow. Proposed default: KEEP (internal utility route, should remain accessible).                                                                                                                      |

---

_End of tech-inventory.md_
