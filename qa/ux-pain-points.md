# RentOS QA — UX Pain Points (Consolidated)

**Generated:** 2026-04-11  
**Sources:** landlord-ux-issues.md (9 items), tenant-ux-issues.md (7 items)  
**Total unique items:** 16 (after 1 merge noted below)

**Dedupe note:** UX-L-03 (wizard creates duplicate property with no warning) and UX-L-01/UX-L-02 (wizard onboarding friction) all trace to the same Generate button flow as BUG-L-01. They are listed as UX items here because they have distinct UX fix suggestions beyond the bug fix. No full merges required across landlord/tenant lists.

Items are ranked by user impact: data loss / trust damage first, then flow abandonment risk, then confusion and friction.

---

## Rank 1 — UX-L-04: "Confirm Payment" label is identical for claimed vs unclaimed — landlord may confirm a payment not yet received

- **Affected persona:** Landlord (Thai, phone-primary, low tech-savvy)
- **Pain:** The confirm button changes color (amber for claimed, green for unclaimed) but always shows the same label `t('payments.confirm_payment')`. A landlord who doesn't register the amber warning may tap it thinking she's initiating a reminder — not confirming a tenant claim. She may confirm a payment she has not actually received.
- **Concrete fix:** Use two visually and textually distinct components. Amber path: "Verify Claimed Payment" section with the tenant's claim note prominently displayed + explicit copy: "Your tenant says they paid on [date]. Tap below to confirm you received it." Green path: "Mark as Paid" with a simpler confirmation prompt. Never share a label between two materially different actions.
- **Estimated impact:** Prevents accidental payment confirmation; reduces landlord-tenant payment disputes.

---

## Rank 2 — UX-T-06: "No contract" dead end on every tenant page — new tenants have no path to pairing

- **Affected persona:** Tenant (Thai first-time renter, cheap Android)
- **Pain:** Dashboard, maintenance, payments, penalties, and co-tenants pages all show a plain `t('tenant.no_contract')` string when no active contract exists. No actionable next step. A brand-new tenant who just signed up but hasn't redeemed a pairing code sees "No contract" on every tab with no guidance.
- **Concrete fix:** Replace the plain string with a card component: title "Pair with your landlord" / "จับคู่กับเจ้าของบ้าน", body "Enter the 6-character code your landlord shared with you", CTA button linking to `/tenant/pair`. Show this card on every page that currently shows the dead-end string.
- **Estimated impact:** Directly reduces pairing abandonment; every new tenant hits this state.

---

## Rank 3 — UX-L-03: Wizard confirms "Generate" will create a new property — no affordance when prefilled

- **Affected persona:** Landlord
- **Pain:** When arriving at the wizard with `?property_id=X`, property fields are prefilled. Landlord hits Generate. A silent duplicate property is created (BUG-L-01). Two identical properties now appear in her list. She doesn't know which has the active contract. This erodes trust.
- **Concrete fix:** On step 6 (Generate), show a summary card: if arrived with `?property_id=`, show "Saving contract under [existing property name]". If new, show "Creating new property: [name]". Never silently create records on Generate. Fix requires BUG-L-01 (P0-01) to be resolved first; this UX item adds the confirmation copy.
- **Estimated impact:** Prevents orphan property accumulation and landlord confusion.

---

## Rank 4 — UX-L-02: Wizard exits to upload page — no back path; wizard state lost on browser Back

- **Affected persona:** Landlord
- **Pain:** Onboarding step 3 "Upload Contract" routes to `/landlord/contracts/upload` via `router.push()`. The upload page has no "back to onboarding" link. Pressing browser Back returns to step 3 but React state is gone (wizard resets). Low-tech user is stranded — she doesn't know if her property was saved.
- **Concrete fix:** Either (a) use `window.open('/landlord/contracts/upload', '_blank')` so the wizard stays open behind the upload page, or (b) embed a minimal inline file-picker in the wizard step that posts to the same upload API without leaving the page. Option (b) is preferable for mobile.
- **Estimated impact:** Prevents onboarding abandonment from the most common friction point in first-use flow.

---

## Rank 5 — UX-T-01: Pair page — no guidance on where to find the code

- **Affected persona:** Tenant
- **Pain:** `/tenant/pair` shows an input asking for a 6-character code with placeholder "ABC123" but no instruction that the tenant must ask their landlord for this code. First-timers arriving without a code (common: landlord shares a link to the pair page, not the code itself) will stare at a blank input and leave.
- **Concrete fix:** Add a one-line callout below the title: "Ask your landlord for a 6-character pairing code" / "ขอรหัส 6 ตัวอักษรจากเจ้าของบ้าน". The space exists; this is a one-line copy change.
- **Estimated impact:** Reduces pairing support burden; highest-frequency new-user confusion point.

---

## Rank 6 — UX-L-07: Pairing page — QR code and short code have no clear hierarchy; landlords send QR screenshots via LINE

- **Affected persona:** Landlord
- **Pain:** Post-generate page shows QR code, "Or enter code" label, large monospace code, expiry time, and a 3-step instruction list all at the same visual weight. A landlord wants to send the pairing code to her tenant via LINE — she takes a screenshot of the QR, sends it; tenant cannot scan a QR from a chat image.
- **Concrete fix:** Primary section: large bold "Share this code: XXXXXX" with a prominent LINE/copy share button that pre-fills "Join RentOS — your code is XXXXXX. Enter it at [url]". Secondary section (smaller, below): QR code with label "Or scan this QR code in person".
- **Estimated impact:** Reduces pairing failures caused by QR-via-chat misuse; directly impacts every new tenant pairing.

---

## Rank 7 — UX-L-01: Skip step in onboarding has no visibility — "Upload Contract" feels mandatory

- **Affected persona:** Landlord
- **Pain:** "Upload Contract" is a full-width saffron button; "Skip this step" is a secondary border button below it. A first-time Thai landlord with a physical contract (no digital copy on phone) may feel forced to upload now, triggering the route-exit problem (UX-L-02) or abandoning onboarding entirely.
- **Concrete fix:** Move "Skip / I'll do this later" above the upload CTA as the visually dominant default for this step. Use a ghost-style button for Upload, not saffron. Add a note: "You can upload your contract anytime from the Properties page." This reframes upload as optional, not expected.
- **Estimated impact:** Reduces first-session drop-off at onboarding step 3.

---

## Rank 8 — UX-T-02: "I've Paid This" button label is ambiguous — tenants think it records payment

- **Affected persona:** Tenant
- **Pain:** `payments.claim_paid` (likely rendered "I've Paid This" or similar) implies the tenant has already paid and this button records it. A first-timer may tap it assuming rent is registered — then be confused by the "awaiting landlord confirmation" amber banner. They may tap again or panic-message their landlord.
- **Concrete fix:** Relabel to "Notify landlord I paid" / "แจ้งเจ้าของบ้านว่าชำระแล้ว". Add a one-line hint below: "Your landlord will confirm receipt before this is marked complete."
- **Estimated impact:** Reduces support messages from tenants confused by the two-step claim/confirm flow.

---

## Rank 9 — UX-L-05: No landlord-side "Create Maintenance Request" — landlords who discover issues have nowhere to log them

- **Affected persona:** Landlord
- **Pain:** The maintenance page has no "+ New Request" button for the landlord. Landlords often discover maintenance needs themselves during property visits. With no creation path (other than the beta simulation panel), all maintenance history must come through tenants — or go unrecorded.
- **Concrete fix:** Add "+ New Request" button in the maintenance page header, opening a form with: contract (dropdown), title, description, photo upload. Pre-fill `raised_by` with landlord's user ID. The existing `POST /api/maintenance` API already accepts landlord-created requests.
- **Estimated impact:** Closes a real workflow gap; enables landlords to maintain a complete maintenance history.

---

## Rank 10 — UX-L-08: Empty dashboard with no CTA — returning users with no data see a dead-end

- **Affected persona:** Landlord
- **Pain:** When `totalPropertyCount === 0`, the dashboard shows four stat cards with "0" and two empty-state messages with no CTA, no "Add your first property" link, no onboarding nudge. A landlord who deleted a test property returns to a dead-end dashboard.
- **Concrete fix:** When `totalPropertyCount === 0`, render a full-width empty-state card: "Welcome back! Add a property to get started." Primary CTA button → `/landlord/onboarding` or `/landlord/properties`. Replace all four zero-cards with this single call-to-action.
- **Estimated impact:** Prevents abandonment for returning users with empty accounts; common in early beta.

---

## Rank 11 — UX-T-03: Contract auto-reparse triggers silent `window.location.reload()` — looks like a crash on slow Android

- **Affected persona:** Tenant
- **Pain:** Background auto-reparse fires `fetch('/api/contracts/${c.id}/reparse')` and then calls `window.location.reload()` on success. Tenant sees the page go blank without warning. On a cheap Android on 3G, the reload takes 3–5 seconds — looks like a crash.
- **Concrete fix:** Show a subtle status banner ("Updating contract terms…") while the reparse fires. Suppress the auto-reload and instead update state from the API response directly, or at minimum give the user a heads-up before the reload blanks the screen.
- **Estimated impact:** Prevents false "app crashed" perception during a normal background operation.

---

## Rank 12 — UX-L-06: Renewal defaults to 12 months regardless of original lease — surprises short-lease landlords

- **Affected persona:** Landlord
- **Pain:** The renew page defaults `leaseEnd = addYears(prevEnd, 1)` always. For a 6-month lease, this defaults to a 12-month renewal — double the original. Non-tech landlords accept the default and send an unexpected 12-month offer.
- **Concrete fix:** Default renewal duration to match original lease: `const originalDurationMs = originalLeaseEnd - originalLeaseStart`. Then `defaultEnd = new Date(prevEnd.getTime() + originalDurationMs)`. The 12-month override remains available via the date picker.
- **Estimated impact:** Reduces renewal disputes caused by mismatched default duration.

---

## Rank 13 — UX-T-05: Co-tenants "Remove" fires immediately with no confirmation

- **Affected persona:** Tenant
- **Pain:** `handleRemove` fires the DELETE API call immediately on button tap — no confirmation dialog. Accidental tap on a small-screen Android removes the co-tenant permanently with no undo.
- **Concrete fix:** Add an inline confirmation: replace the Remove button with "Remove | [Remove] [Cancel]" inline row confirmation before the API fires. No modal needed — just a two-button inline reveal.
- **Estimated impact:** Prevents accidental co-tenant removal, most likely on mobile.

---

## Rank 14 — UX-T-04: Maintenance cost figures shown without context — tenants worry about surprise charges

- **Affected persona:** Tenant
- **Pain:** `estimated_cost` and `actual_cost` appear as bare currency values (e.g., "฿2,000") in the maintenance detail modal. No indication of who bears the cost. Tenants assume they are being charged.
- **Concrete fix:** Add a caption "Repair cost (charged to landlord)" / "(ค่าซ่อมที่เจ้าของบ้านรับผิดชอบ)" below the cost lines, or an info icon tooltip. One-line copy addition.
- **Estimated impact:** Reduces tenant anxiety and misunderstanding of cost responsibility.

---

## Rank 15 — UX-T-07: Documents "View" opens raw Supabase URL in new tab — images strand tenant outside the app

- **Affected persona:** Tenant
- **Pain:** `<a target="_blank">` with a Supabase signed URL. On Android Chrome, PDFs open in the browser's viewer (acceptable). But images load in a raw browser tab with no app chrome — browser Back takes the user to browser history, not the app.
- **Concrete fix:** For `image/*` MIME types, use an in-app lightbox overlay instead of a new tab. For PDFs, the new-tab behaviour is acceptable (no change needed).
- **Estimated impact:** Reduces app-exit confusion for tenants viewing image documents.

---

## Rank 16 — UX-L-09: `?filter=expiring` in renewals banner lands on unfiltered property list (known deferred)

- **Affected persona:** Landlord
- **Pain:** Dashboard renewals banner "Review" button → `/landlord/contracts?filter=expiring` → redirects to `/landlord/properties` with no filtering. Banner intent is lost.
- **Concrete fix:** Option A — pass `?filter=expiring` through to the properties list and add a filter to `PropertyListRow` that highlights expiring contracts. Option B — change the banner link to `/landlord/properties` with a toast "Contracts expiring soon are highlighted below" and add a saffron badge to matching rows.
- **Estimated impact:** Low immediate impact (banner is informational), but breaks trust when the CTA leads nowhere. Deferred sprint carry-over — should be scheduled.
- **Note:** Previously documented in SPRINT_REPORT_BETA_HARDENING.md:153.
