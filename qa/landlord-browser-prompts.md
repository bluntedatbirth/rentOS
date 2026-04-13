# Landlord Flow — Browser Verification Prompts

**Total prompts:** 7

**Methodology:** These prompts cover flows where static code analysis alone cannot confirm correct behavior — they require live session state, network responses, RLS enforcement, or visual rendering to verify. Each prompt is self-contained and assumes the beta simulation panel is available (`NEXT_PUBLIC_BETA_SIMULATIONS=true`). Run sequentially or independently as the app state allows.

---

### BROWSER-L-01: AI wizard creates duplicate property on generate

**URL:** http://localhost:3000/landlord/contracts/create
**Precondition:** Logged-in landlord with at least 1 existing property. Note the property count on `/landlord/properties` before starting.
**Steps:**

1. Navigate to `/landlord/properties`, note the property named "Test Property Alpha" (or any name).
2. Click "Create Contract" next to that property — lands on `/landlord/contracts/create?property_id=<uuid>`.
3. Complete all 6 wizard steps. On step 6, confirm the property name field shows "Test Property Alpha".
4. Click Generate Contract. Wait for success notification.
5. Navigate to `/landlord/properties` and count the total properties.
   **Check:** Count of properties after generation vs. before.
   **Success criteria:** Property count is unchanged (wizard reuses existing property). FAIL if a second "Test Property Alpha" (or duplicate name) appears.
   **Related bug:** BUG-L-01

---

### BROWSER-L-02: Confirm payment — tenant notification and metadata

**URL:** http://localhost:3000/landlord/payments
**Precondition:** Active contract with a tenant paired. Use beta panel `auto_pair_demo_tenant` to set up if needed. Ensure at least one pending payment exists.
**Steps:**

1. Open a second browser tab, sign in as the demo tenant.
2. As landlord, navigate to `/landlord/payments`.
3. Find a pending payment in the "Due" section — click "Confirm Payment".
4. Switch to the tenant tab and check `/tenant/payments` — check notification inbox too.
   **Check:** (a) Tenant notification says "Payment Confirmed" not "Payment Due". (b) As landlord, open DevTools → Network, find the PATCH request to `/api/payments/{id}`. Confirm response includes `confirmation_date` and `confirmed_by` fields.
   **Success criteria:** Tenant receives notification. Response includes `confirmation_date`. FAIL if either is missing.
   **Related bug:** BUG-L-02

---

### BROWSER-L-03: Renew an expired contract

**URL:** http://localhost:3000/landlord/contracts
**Precondition:** A contract with `status = 'expired'` exists. Use the beta simulation panel to advance a contract to expired, or manually expire one via the Supabase SQL editor: `UPDATE contracts SET status='expired', lease_end='2025-01-01' WHERE id='<uuid>';`
**Steps:**

1. Navigate to the expired contract's detail page.
2. Check whether a "Renew Contract" or "Propose Renewal" button is visible.
3. If present, click it and attempt to submit a renewal via the renew page.
4. Alternatively, use DevTools to POST directly: `fetch('/api/contracts/<expired_id>/renew', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lease_start:'2026-05-01',lease_end:'2027-05-01'})})`.
   **Check:** API response status code.
   **Success criteria:** API returns 400 or 403 with a clear error. FAIL if a new renewal contract row is created in the database.
   **Related bug:** BUG-L-03

---

### BROWSER-L-04: Generated contract status after wizard

**URL:** http://localhost:3000/landlord/contracts/create
**Precondition:** DEFER_TIER_ENFORCEMENT=true so Pro gate doesn't block. Fresh landlord account or use beta panel `reset_my_data` equivalent.
**Steps:**

1. Complete the 6-step wizard with a new property name. Choose `output_language: 'bilingual'`.
2. Click Generate Contract, wait for success.
3. Click the notification or navigate to the new contract's detail page.
4. Observe the contract's status badge.
   **Check:** (a) Status badge value. (b) Whether any clauses appear in the clause list. (c) Whether a "Reparse" button is visible.
   **Success criteria:** Status should be `pending` (awaiting tenant), clauses should be parsed and visible. FAIL if status is `parse_failed` or no clauses appear.
   **Related bug:** BUG-L-04

---

### BROWSER-L-05: Pairing generate API — ownership check

**URL:** http://localhost:3000/landlord/contracts/<contract_id_of_another_landlord>/pair
**Precondition:** Two landlord accounts (Landlord A and Landlord B). Landlord B has at least one contract. Note Landlord B's contract ID.
**Steps:**

1. Sign in as Landlord A.
2. Navigate directly to `/landlord/contracts/<landlord_B_contract_id>/pair`.
3. Click "Generate Pairing Code".
   **Check:** (a) Does the page render the generate button? (b) API response when clicking it.
   **Success criteria:** API returns 403 or 404 — Landlord A cannot generate a pair code for Landlord B's contract. FAIL if a code is successfully generated.
   **Related bug:** BUG-L-11

---

### BROWSER-L-06: Maintenance client-side reload — cross-tenant data check

**URL:** http://localhost:3000/landlord/maintenance
**Precondition:** Two landlord accounts, each with at least one maintenance request on different properties.
**Steps:**

1. Sign in as Landlord A.
2. Navigate to `/landlord/maintenance`.
3. Update the status of a maintenance request (click "Start Work").
4. After reload, check the property filter dropdown — confirm only Landlord A's properties appear.
5. Check the request list — confirm no requests from Landlord B's properties appear.
   **Check:** Property names in filter, requests visible.
   **Success criteria:** Only Landlord A's properties appear in the filter. No cross-tenant requests visible. FAIL if any other landlord's data appears.
   **Related bug:** BUG-L-05

---

### BROWSER-L-07: Locale — dashboard activity timestamps and activity text in TH

**URL:** http://localhost:3000/landlord/dashboard
**Precondition:** Active contract with payment history. Switch locale to TH (click language toggle).
**Steps:**

1. Ensure at least one payment was confirmed in the last 7 days (use beta panel if needed).
2. Switch locale to TH using the locale toggle.
3. Open the dashboard.
4. Observe the "Recent Activity" panel.
   **Check:** (a) Activity item text (e.g., "Payment confirmed —...") — is it in Thai or English? (b) Relative timestamps ("Just now", "2h ago") — are they in Thai or English?
   **Success criteria:** All activity text and timestamps should be in Thai. FAIL if English strings appear when TH locale is active.
   **Related bugs:** BUG-L-06, BUG-L-07
